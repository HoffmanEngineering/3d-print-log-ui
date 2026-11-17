import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SubscriptionCanceledComponent } from './subscription-canceled.component';

describe('SubscriptionCanceledComponent', () => {
  let component: SubscriptionCanceledComponent;
  let fixture: ComponentFixture<SubscriptionCanceledComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SubscriptionCanceledComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionCanceledComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
