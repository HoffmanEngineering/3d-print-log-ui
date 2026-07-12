import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-mcp',
  templateUrl: './docs-mcp.component.html',
  styleUrls: ['./docs-mcp.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsMcpComponent {
  /**
   * The remote MCP endpoint URL that AI clients connect to.
   * NOTE (Task 20): confirm the production host before launch.
   */
  public readonly mcpEndpoint = 'https://api.3dprintlog.com/mcp';
}
