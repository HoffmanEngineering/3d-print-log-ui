import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocStepComponent } from './doc-step.component';
import { DocStepsComponent } from './doc-steps.component';

@Component({
  imports: [DocStepsComponent, DocStepComponent],
  template: `
    <doc-steps>
      <doc-step heading="Install the plugin">
        <p>Open the plugin manager.</p>
      </doc-step>
      <doc-step>
        <p>Paste your API key.</p>
      </doc-step>
    </doc-steps>
  `,
})
class HostComponent {}

describe('DocStepsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('projects every step, with its prose', () => {
    const steps = fixture.nativeElement.querySelectorAll('doc-step');

    expect(steps.length).toBe(2);
    expect(steps[0].textContent).toContain('Open the plugin manager.');
    expect(steps[1].textContent).toContain('Paste your API key.');
  });

  it('is a list of list items, which the markup alone would not say', () => {
    // The steps hold block prose, so they are not an <ol>/<li>. The semantics
    // a numbered list carries have to be restored explicitly.
    expect(
      fixture.nativeElement.querySelector('doc-steps').getAttribute('role')
    ).toBe('list');

    const steps = fixture.nativeElement.querySelectorAll('doc-step');
    expect(steps[0].getAttribute('role')).toBe('listitem');
    expect(steps[1].getAttribute('role')).toBe('listitem');
  });

  it('renders a step heading only when one is given', () => {
    const steps = fixture.nativeElement.querySelectorAll('doc-step');

    expect(
      steps[0].querySelector('.doc-step__heading')?.textContent?.trim()
    ).toBe('Install the plugin');
    expect(steps[1].querySelector('.doc-step__heading')).toBeNull();
  });

  it('keeps the step title a real heading, so it is reachable by heading nav', () => {
    // These were '#### Step N' in the Markdown. Rendering them as paragraphs
    // would drop six setup sections out of a screen reader's heading list.
    const heading = fixture.nativeElement.querySelector('.doc-step__heading');

    expect(heading.tagName).toBe('H4');
  });

  it('gives the step heading no id, so it stays out of the table of contents', () => {
    // The outline is generated from the page template; a step is part of a
    // procedure, not a section of the page.
    const heading = fixture.nativeElement.querySelector('.doc-step__heading');

    expect(heading.getAttribute('id')).toBeNull();
  });
});
