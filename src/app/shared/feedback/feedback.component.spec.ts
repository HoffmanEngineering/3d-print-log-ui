import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { dispatchBeforeUnload } from 'src/app/core/guards/testing/dispatch-before-unload';
import { FeedbackService } from 'src/app/core/services/feedback.service';

import { FeedbackComponent } from './feedback.component';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: FeedbackService,
          useValue: {
            addFeedback: vi.fn().mockName('FeedbackService.addFeedback'),
          },
        },
        {
          provide: ToastrService,
          useValue: {
            success: vi.fn().mockName('ToastrService.success'),
            error: vi.fn().mockName('ToastrService.error'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lets the page unload while the form is pristine', () => {
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('asks before unloading while the form is dirty', () => {
    component.form.markAsDirty();

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  describe('the Submit button', () => {
    let response: Subject<unknown>;
    const submit = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type="submit"]'
      )!;

    beforeEach(() => {
      response = new Subject();
      (
        TestBed.inject(FeedbackService) as MockedObject<FeedbackService>
      ).addFeedback.mockReturnValue(response as never);

      component.form.patchValue({ note: 'More charts, please' });
      fixture.detectChanges();
    });

    it('is disabled while the feedback is being sent', () => {
      expect(submit().disabled).toBe(false);

      submit().click();
      fixture.detectChanges();

      expect(submit().disabled).toBe(true);
    });

    it('is enabled again when sending fails', () => {
      submit().click();
      fixture.detectChanges();

      response.error(new Error('offline'));
      fixture.detectChanges();

      expect(submit().disabled).toBe(false);
    });
  });
});
