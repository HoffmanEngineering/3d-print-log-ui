import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StatPanelComponent } from './stat-panel.component';

describe('StatPanelComponent', () => {
  let component: StatPanelComponent;
  let fixture: ComponentFixture<StatPanelComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [StatPanelComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(StatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
