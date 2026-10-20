import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from '../../../core/services/logging.service';
import { IS_CORDOVA } from '../../../core/utils/platform';
import {
  OnboardingApiService,
  ResendResult,
} from '../../onboarding-api.service';
import { OnboardingService } from '../../onboarding.service';

export type WelcomePath = 'manual' | 'slicer' | 'integration';

/** What the user picked on step 3. `target` is the slicer or integration key, if any. */
export interface PathChoice {
  path: WelcomePath;
  target: string | null;
}

interface PathOption {
  key: string;
  label: string;
  doc: string;
  lines: string[];
}

const CURA_LINES = [
  'In Cura, open the Marketplace and install the 3D Print Log Uploader plugin.',
  'When you save G-code, Cura offers to send the print to 3D Print Log.',
];

const DOWNLOAD_LINE =
  'Download the 3D Print Log uploader and save it somewhere permanent.';

/** The uploader's setup wizard covers only these (see the slic3r-uploader doc). */
const WIZARD_LINES = [
  DOWNLOAD_LINE,
  'Run it once (on Windows, double-click it). Its setup wizard adds a "- 3DPrintLog" preset for each process profile in your slicer.',
  'Pick a "- 3DPrintLog" process preset when you slice, and each export opens a pre-filled print.',
];

/** Slicers the wizard does not detect are set up by hand ("Manual setup" in the doc). */
const MANUAL_LINES = [
  DOWNLOAD_LINE,
  "In your slicer's process settings, enter the full path to the uploader followed by `--default` in the Post-processing scripts field.",
  'Save the preset, and every export made with it opens a pre-filled print.',
];

export interface LinePart {
  text: string;
  code: boolean;
}

/** Splits a setup line at backticks: the odd parts are rendered as `<code>`. */
export function lineParts(line: string): LinePart[] {
  return line
    .split('`')
    .map((text, index) => ({ text, code: index % 2 === 1 }))
    .filter((part) => part.text !== '');
}

function uploader(key: string, label: string, lines: string[]): PathOption {
  return { key, label, doc: '/docs/slic3r-uploader', lines };
}

export const SLICERS: PathOption[] = [
  { key: 'cura', label: 'Cura', doc: '/docs/cura-plugin', lines: CURA_LINES },
  uploader('prusaslicer', 'PrusaSlicer', MANUAL_LINES),
  uploader('orcaslicer', 'OrcaSlicer', WIZARD_LINES),
  uploader('bambu-studio', 'Bambu Studio', MANUAL_LINES),
  uploader('creality-print', 'Creality Print', MANUAL_LINES),
  uploader('snapmaker-orca', 'Snapmaker Orca', WIZARD_LINES),
  uploader('anycubic', 'Anycubic', WIZARD_LINES),
  uploader('elegoo', 'Elegoo', MANUAL_LINES),
  uploader('qidi', 'QIDI', MANUAL_LINES),
  uploader('orca-flashforge', 'Orca Flashforge', MANUAL_LINES),
];

export const INTEGRATIONS: PathOption[] = [
  {
    key: 'klipper',
    label: 'Klipper',
    doc: '/docs/printlog-bridge',
    lines: [
      'printlog-bridge watches your printer through Moonraker and logs every print by itself.',
      'Create an API key, then install the bridge on the printer or in Docker.',
    ],
  },
  {
    key: 'octoprint',
    label: 'OctoPrint',
    doc: '/docs/octoprint-webhook',
    lines: [
      'The OctoPrint-Webhook plugin sends each finished print to 3D Print Log.',
      'Create an API key, then paste it into the plugin with your printer ID.',
    ],
  },
];

const RESEND_COPY: Record<Exclude<ResendResult, 'already-verified'>, string> = {
  sent: 'Sent. Check your inbox.',
  'rate-limited': 'We just sent one. Check your inbox and spam folder.',
  failed: "Couldn't send right now. Try again in a minute.",
};

/**
 * Step 3 of the welcome stepper: three ways to log the first print, and a line asking an
 * unverified user to confirm their email. The host finishes the stepper on `chosen`.
 */
@Component({
  selector: 'app-first-print-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './first-print-step.component.html',
  styleUrl: './first-print-step.component.scss',
})
export class FirstPrintStepComponent implements OnInit {
  private readonly onboarding = inject(OnboardingService);
  private readonly api = inject(OnboardingApiService);
  private readonly logging = inject(LoggingService);

  /** Disables the actions while the host is finishing. */
  readonly busy = input(false);
  readonly chosen = output<PathChoice>();

  /** The Cordova app only offers the manual path. */
  readonly showConnections = !inject(IS_CORDOVA);
  readonly slicers = SLICERS;
  readonly lineParts = lineParts;
  readonly integrations = INTEGRATIONS;

  readonly slicerKey = signal<string | null>(null);
  readonly integrationKey = signal<string | null>(null);
  readonly slicer = computed(() =>
    SLICERS.find((s) => s.key === this.slicerKey())
  );
  readonly integration = computed(() =>
    INTEGRATIONS.find((i) => i.key === this.integrationKey())
  );

  readonly emailUnverified = signal(false);
  readonly resending = signal(false);
  readonly resendMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.onboarding
      .status()
      .then((status) =>
        this.emailUnverified.set(status.emailVerified === false)
      )
      .catch(() => this.emailUnverified.set(false));
  }

  selectSlicer(key: string): void {
    this.slicerKey.set(key);
  }

  selectIntegration(key: string): void {
    this.integrationKey.set(key);
  }

  choose(path: WelcomePath, target: string | null = null): void {
    this.chosen.emit({ path, target });
  }

  async resend(): Promise<void> {
    if (this.resending()) {
      return;
    }
    this.resending.set(true);
    this.resendMessage.set(null);
    let result: ResendResult;
    try {
      result = await firstValueFrom(this.api.resendVerificationEmail());
    } catch {
      result = 'failed';
    }
    this.logging.logEvent('VerificationEmail_Resent', { result });
    if (result === 'already-verified') {
      this.emailUnverified.set(false);
    } else {
      this.resendMessage.set(RESEND_COPY[result]);
    }
    this.resending.set(false);
  }
}
