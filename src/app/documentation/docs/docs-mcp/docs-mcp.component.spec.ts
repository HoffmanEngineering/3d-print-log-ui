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

  it('describes what the assistant can be asked, including printers', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('What you can ask');
    expect(text).toContain('Your printers');
    expect(text).toContain('Your materials');
  });

  it('does not promise print settings the assistant cannot read', () => {
    // Layer heights, temperatures, and speeds live only in free-text notes, so the
    // assistant cannot answer them. The page must say so rather than imply otherwise.
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No print settings');
  });
});
