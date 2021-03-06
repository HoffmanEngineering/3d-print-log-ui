import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsOctoprintWebhookComponent } from './docs-octoprint-webhook.component';

describe('DocsOctoprintWebhookComponent', () => {
  let component: DocsOctoprintWebhookComponent;
  let fixture: ComponentFixture<DocsOctoprintWebhookComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocsOctoprintWebhookComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsOctoprintWebhookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
