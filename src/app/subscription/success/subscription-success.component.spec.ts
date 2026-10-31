import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SubscriptionSuccessComponent } from './subscription-success.component';
import { LoggingService } from '../../core/services/logging.service';

describe('SubscriptionSuccessComponent', () => {
  let component: SubscriptionSuccessComponent;
  let fixture: ComponentFixture<SubscriptionSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SubscriptionSuccessComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
