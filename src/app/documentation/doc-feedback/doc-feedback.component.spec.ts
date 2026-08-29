import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DocsTelemetryService } from '../docs-telemetry.service';
import { DocFeedbackComponent } from './doc-feedback.component';

describe('DocFeedbackComponent', () => {
  let telemetry: jasmine.SpyObj<DocsTelemetryService>;
  let fixture: ComponentFixture<DocFeedbackComponent>;

  beforeEach(async () => {
    telemetry = jasmine.createSpyObj<DocsTelemetryService>(
      'DocsTelemetryService',
      ['trackFeedback']
    );

    await TestBed.configureTestingModule({
      imports: [DocFeedbackComponent, NoopAnimationsModule],
      providers: [{ provide: DocsTelemetryService, useValue: telemetry }],
    }).compileComponents();

    fixture = TestBed.createComponent(DocFeedbackComponent);
    fixture.componentRef.setInput('pageKey', 'prints');
    fixture.detectChanges();
  });

  function navigateTo(slug: string): void {
    fixture.componentRef.setInput('pageKey', slug);
    fixture.detectChanges();
  }

  function click(cy: string): void {
    const el = fixture.nativeElement.querySelector(`[data-cy="${cy}"]`);
    expect(el).withContext(`missing [data-cy="${cy}"]`).toBeTruthy();
    el.click();
    fixture.detectChanges();
  }

  function present(cy: string): boolean {
    return !!fixture.nativeElement.querySelector(`[data-cy="${cy}"]`);
  }

  function typeComment(text: string): void {
    const input = fixture.nativeElement.querySelector(
      '[data-cy="doc-feedback-comment"]'
    ) as HTMLTextAreaElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('reports a positive vote as soon as it is given', () => {
    click('doc-feedback-yes');

    expect(telemetry.trackFeedback).toHaveBeenCalledOnceWith(true, undefined);
  });

  it('does not ask a positive voter for a comment', () => {
    click('doc-feedback-yes');

    expect(present('doc-feedback-comment')).toBe(false);
  });

  it('holds a negative vote back until the reader has had a chance to explain', () => {
    click('doc-feedback-no');

    expect(telemetry.trackFeedback).not.toHaveBeenCalled();
    expect(present('doc-feedback-comment')).toBe(true);
  });

  it('sends the negative vote with the comment when submitted', () => {
    click('doc-feedback-no');
    typeComment('the QR label section is unclear');
    click('doc-feedback-submit');

    expect(telemetry.trackFeedback).toHaveBeenCalledOnceWith(
      false,
      'the QR label section is unclear'
    );
  });

  it('still sends the negative vote when the reader skips the comment', () => {
    click('doc-feedback-no');
    click('doc-feedback-skip');

    expect(telemetry.trackFeedback).toHaveBeenCalledOnceWith(false, undefined);
  });

  it('flushes an unsent negative vote when the reader navigates away', () => {
    click('doc-feedback-no');
    typeComment('half-written thought');

    fixture.destroy();

    expect(telemetry.trackFeedback).toHaveBeenCalledOnceWith(
      false,
      'half-written thought'
    );
  });

  it('does not double-report when the vote was already submitted', () => {
    click('doc-feedback-no');
    click('doc-feedback-skip');

    fixture.destroy();

    expect(telemetry.trackFeedback).toHaveBeenCalledTimes(1);
  });

  it('thanks the reader and stops accepting further votes', () => {
    click('doc-feedback-yes');

    expect(present('doc-feedback-thanks')).toBe(true);
    expect(present('doc-feedback-yes')).toBe(false);
    expect(present('doc-feedback-no')).toBe(false);
  });

  it('reports nothing when the reader never votes', () => {
    fixture.destroy();

    expect(telemetry.trackFeedback).not.toHaveBeenCalled();
  });

  describe('moving between pages', () => {
    it('asks again on the next page instead of staying thanked', () => {
      click('doc-feedback-yes');
      expect(present('doc-feedback-thanks')).toBe(true);

      navigateTo('materials');

      expect(present('doc-feedback-yes')).toBe(true);
      expect(present('doc-feedback-thanks')).toBe(false);
    });

    it('flushes a pending negative vote before the page changes', () => {
      click('doc-feedback-no');
      typeComment('could not find the answer');

      navigateTo('materials');

      expect(telemetry.trackFeedback).toHaveBeenCalledOnceWith(
        false,
        'could not find the answer'
      );
    });

    it('clears the previous page comment from the box', () => {
      click('doc-feedback-no');
      typeComment('page one problem');

      navigateTo('materials');
      click('doc-feedback-no');

      const input = fixture.nativeElement.querySelector(
        '[data-cy="doc-feedback-comment"]'
      ) as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });

    it('does not report anything when the reader simply moves on without voting', () => {
      navigateTo('materials');

      expect(telemetry.trackFeedback).not.toHaveBeenCalled();
    });
  });
});
