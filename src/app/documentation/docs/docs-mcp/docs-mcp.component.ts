import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-mcp',
  templateUrl: './docs-mcp.component.html',
  styleUrls: ['./docs-mcp.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsMcpComponent {
  /** The remote MCP endpoint URL that AI clients connect to. */
  public readonly mcpEndpoint = 'https://api.3dprintlog.com/mcp';

  /**
   * Public OAuth client id for the MCP connector. Safe to publish: this is a public
   * (PKCE) client with no secret, which is exactly why every user can share one id.
   * Clients cannot discover it automatically (Dynamic Client Registration is off), so
   * without it on this page nobody can complete a connection.
   */
  public readonly mcpClientId = 'uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j';

  /** Ready-to-paste command for the Claude Code CLI. */
  public readonly claudeCodeCommand =
    `claude mcp add --transport http printlog ${this.mcpEndpoint} ` +
    `--client-id ${this.mcpClientId} --callback-port 8400`;
}
