import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { PricingComponent } from './pricing.component';
import { SharedModule } from '../../shared/shared.module';
import { LoggingService } from '../../core/services/logging.service';

describe('PricingComponent', () => {
  let component: PricingComponent;
  let fixture: ComponentFixture<PricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PricingComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default isPro to false', () => {
    expect(component.isPro()).toBeFalse();
  });
});
