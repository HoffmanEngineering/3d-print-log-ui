import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PendingSlicerUploadDto,
  SlicerUploadService,
  isValidSlicerInstallId,
} from 'src/app/core/services/slicer-upload.service';
import { BackToOrcaSlicerComponent } from 'src/app/shared/back-to-orca-slicer/back-to-orca-slicer.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { HumanizePipe } from 'src/app/shared/pipes/humanize.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { withDeferredSkeleton } from 'src/app/shared/skeleton/deferred-skeleton';

/** How recent a lone, unopened upload must be for the page to open it straight away. */
export const AUTO_OPEN_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * `idle` is the window before the skeleton is allowed to appear, so a fast
 * response never flashes the empty state. `redirecting` means the page is
 * already on its way to the one fresh upload and should not paint the list.
 */
type OrcaUploadsPhase =
  | 'idle'
  | 'loading'
  | 'invalid'
  | 'error'
  | 'redirecting'
  | 'ready';

interface OrcaUploadsState {
  phase: OrcaUploadsPhase;
  uploads: PendingSlicerUploadDto[];
  /** The error was a 429: the API allows 60 of these a minute per user. */
  rateLimited?: boolean;
}

const IDLE_STATE: OrcaUploadsState = { phase: 'idle', uploads: [] };
const LOADING_STATE: OrcaUploadsState = { phase: 'loading', uploads: [] };
const INVALID_STATE: OrcaUploadsState = { phase: 'invalid', uploads: [] };

const PLUGIN_VERSION_PREFIX = 'orca-plugin/';

/**
 * "OrcaSlicer 2.5.0, plugin 0.1.0". The API stores the plugin's version as
 * `orca-plugin/<version>`; the prefix is for the server, not the reader.
 */
export function uploadVersionLabel(upload: PendingSlicerUploadDto): string {
  const parts: string[] = [];
  if (upload.slicerVersion) {
    parts.push(`OrcaSlicer ${upload.slicerVersion}`);
  }
  const plugin = upload.pluginVersion?.startsWith(PLUGIN_VERSION_PREFIX)
    ? upload.pluginVersion.slice(PLUGIN_VERSION_PREFIX.length)
    : upload.pluginVersion;
  if (plugin) {
    parts.push(`plugin ${plugin}`);
  }
  return parts.join(', ');
}

/** Query params for `/prints/new/cura`, which turns a setting id into a new print. */
export function newPrintQueryParams(
  upload: PendingSlicerUploadDto
): Record<string, string> {
  return {
    // The new-print route recognizes a slicer upload by both params being
    // present, so an unknown version is sent as an empty value, not dropped.
    cura_version: upload.slicerVersion ?? '',
    plugin_version: upload.pluginVersion ?? '',
    settingId: upload.settingId,
  };
}

/**
 * The one upload to open without asking: there is exactly one, nobody has
 * opened it, and it was sliced in the last ten minutes. That is "Open in
 * browser" right after a slice, where a list of one is just an extra click.
 */
export function uploadToAutoOpen(
  uploads: PendingSlicerUploadDto[],
  now: number = Date.now()
): PendingSlicerUploadDto | null {
  if (uploads.length !== 1) {
    return null;
  }
  const [upload] = uploads;
  if (upload.claimed) {
    return null;
  }
  const created = new Date(upload.createdDate).getTime();
  if (isNaN(created)) {
    return null;
  }
  const age = now - created;
  // A small negative age is clock skew between the server and this device.
  return age < AUTO_OPEN_MAX_AGE_MS ? upload : null;
}

/**
 * `/prints/new/orca?device=<installId>`: the prints one OrcaSlicer install has
 * uploaded and the signed-in user can still log. The plugin's "Open in browser"
 * links here.
 */
@Component({
  selector: 'app-orca-pending-uploads',
  templateUrl: './orca-pending-uploads.component.html',
  styleUrls: ['./orca-pending-uploads.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BackToOrcaSlicerComponent,
    RouterLink,
    MatButton,
    MatIcon,
    EmptyStateComponent,
    SkeletonComponent,
    DurationPipe,
    HumanizePipe,
    LocaleDatePipe,
  ],
})
export class OrcaPendingUploadsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly slicerUploadService = inject(SlicerUploadService);
  private readonly loggingService = inject(LoggingService);
  private readonly titleService = inject(Title);

  private readonly retry$ = new Subject<void>();

  readonly skeletonRows = [0, 1, 2];

  readonly state = toSignal(
    combineLatest([
      this.route.queryParamMap.pipe(
        map((params) => params.get('device')),
        distinctUntilChanged()
      ),
      this.retry$.pipe(startWith(undefined)),
    ]).pipe(switchMap(([device]) => this.load(device))),
    { initialValue: IDLE_STATE }
  );

  ngOnInit(): void {
    this.titleService.setTitle('Prints from OrcaSlicer - 3D Print Log');
  }

  retry(): void {
    this.retry$.next();
  }

  displayName(upload: PendingSlicerUploadDto): string {
    return upload.printName || upload.fileName || 'Untitled print';
  }

  versionLabel(upload: PendingSlicerUploadDto): string {
    return uploadVersionLabel(upload);
  }

  queryParams(upload: PendingSlicerUploadDto): Record<string, string> {
    return newPrintQueryParams(upload);
  }

  onOpen(upload: PendingSlicerUploadDto): void {
    this.loggingService.logEvent('OrcaPendingUploads_Opened', {
      claimed: upload.claimed,
      count: this.state().uploads.length,
    });
  }

  private load(device: string | null): Observable<OrcaUploadsState> {
    if (!isValidSlicerInstallId(device)) {
      return of(INVALID_STATE);
    }

    return this.slicerUploadService.getPendingUploads(device).pipe(
      map((uploads): OrcaUploadsState => {
        const list = uploads ?? [];
        return {
          phase: uploadToAutoOpen(list) ? 'redirecting' : 'ready',
          uploads: list,
        };
      }),
      tap((state) => {
        if (state.phase === 'redirecting') {
          this.autoOpen(state.uploads[0]);
        }
      }),
      catchError((error: unknown) => {
        // A 401 rarely gets here: the route is behind authGuard and the auth
        // interceptor renews the token. Everything else is retryable.
        const status = (error as { status?: number } | null)?.status;
        this.loggingService.logEvent('OrcaPendingUploads_Error', { status });
        return of<OrcaUploadsState>({
          phase: 'error',
          uploads: [],
          rateLimited: status === 429,
        });
      }),
      withDeferredSkeleton(LOADING_STATE)
    );
  }

  private autoOpen(upload: PendingSlicerUploadDto): void {
    this.loggingService.logEvent('OrcaPendingUploads_AutoOpened');
    // replaceUrl: Back from the new print skips this page, which would only
    // open the same print again.
    void this.router.navigate(['/prints/new/cura'], {
      queryParams: newPrintQueryParams(upload),
      replaceUrl: true,
    });
  }
}
