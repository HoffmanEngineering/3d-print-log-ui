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

  it('leaves the step heading out of the document outline', () => {
    // The table of contents is built from h2-h4. A step is not a section of
    // the page, so numbering it as one would flood the rail.
    const steps = fixture.nativeElement.querySelector('doc-steps');

    expect(steps.querySelectorAll('h1, h2, h3, h4, h5, h6').length).toBe(0);
  });
});
