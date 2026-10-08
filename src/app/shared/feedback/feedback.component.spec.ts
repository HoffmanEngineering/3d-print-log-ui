import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
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
          useValue: jasmine.createSpyObj<FeedbackService>('FeedbackService', [
            'addFeedback',
          ]),
        },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj<ToastrService>('ToastrService', [
            'success',
            'error',
          ]),
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
    expect(dispatchBeforeUnload().defaultPrevented).toBeFalse();
  });

  it('asks before unloading while the form is dirty', () => {
    component.form.markAsDirty();

    expect(dispatchBeforeUnload().defaultPrevented).toBeTrue();
  });
});
