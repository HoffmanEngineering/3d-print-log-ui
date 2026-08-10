import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import {
  ConnectedAgent,
  ConnectedAgentsService,
} from '../../core/services/connected-agents.service';
import { LoggingService } from '../../core/services/logging.service';

type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Lists the user's connected AI agents and lets them disconnect all of them.
 *
 * The MCP integration uses a single shared OAuth client, so revocation is per user
 * (not per AI product/device). The UI therefore offers a single "Disconnect all"
 * action rather than per-agent removal.
 */
@Component({
  selector: 'app-connected-agents',
  templateUrl: './connected-agents.component.html',
  styleUrl: './connected-agents.component.scss',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAgentsComponent implements OnInit {
  private readonly connectedAgentsService = inject(ConnectedAgentsService);
  private readonly loggingService = inject(LoggingService);

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly agents = signal<ConnectedAgent[]>([]);
  protected readonly confirming = signal(false);
  protected readonly submitting = signal(false);
  protected readonly revokeFailed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.confirming.set(false);
    this.revokeFailed.set(false);
    this.connectedAgentsService.getConnectedAgents().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  protected startConfirm(): void {
    this.confirming.set(true);
    this.revokeFailed.set(false);
  }

  protected cancel(): void {
    this.confirming.set(false);
  }

  protected disconnectAll(): void {
    if (this.submitting()) {
      return;
    }

    const grants = this.agents();
    this.submitting.set(true);
    this.revokeFailed.set(false);
    this.loggingService.logEvent('ConnectedAgents_Revoke', {
      count: grants.length,
    });

    const revocations = grants.length
      ? forkJoin(
          grants.map((agent) =>
            this.connectedAgentsService.revoke(agent.grantId)
          )
        )
      : of([]);

    revocations.subscribe({
      next: () => {
        this.submitting.set(false);
        this.load();
      },
      error: () => {
        // Keep the rows and let the user retry; nothing was necessarily removed.
        this.submitting.set(false);
        this.revokeFailed.set(true);
      },
    });
  }
}
