import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { DocsMcpComponent } from './docs-mcp.component';

describe('DocsMcpComponent', () => {
  let component: DocsMcpComponent;
  let fixture: ComponentFixture<DocsMcpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsMcpComponent],
      imports: [RouterTestingModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsMcpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create (renders without a logged-in user)', () => {
    expect(component).toBeTruthy();
  });

  it('renders the connect steps and the MCP endpoint URL', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Connect to Claude');
    expect(text).toContain('Connect to ChatGPT');
    expect(text).toContain(component.mcpEndpoint);
  });

  it('shows the OAuth client id and the Claude Code command', () => {
    // Without the client id a user cannot complete a connection at all: Dynamic Client
    // Registration is disabled, so no client can discover it on its own.
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(component.mcpClientId);
    expect(text).toContain('Advanced settings');
    expect(text).toContain(component.claudeCodeCommand);
  });

  it('describes what the assistant can be asked, including printers', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('What you can ask');
    expect(text).toContain('Your printers');
    expect(text).toContain('Your materials');
  });

  it('qualifies print settings as note-dependent rather than promising or denying them', () => {
    // Layer height and speeds are not fields: they are readable only when a slicer
    // integration saved a summary into the print's notes. The page must neither promise
    // them outright nor deny them outright — a verified MCP run answered them from notes.
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Print settings only where you saved them');
    expect(text).toContain('slicer integration');
  });
});
