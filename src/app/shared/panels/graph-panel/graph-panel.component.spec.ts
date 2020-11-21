import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GraphPanelComponent } from './graph-panel.component';

describe('GraphPanelComponent', () => {
  let component: GraphPanelComponent;
  let fixture: ComponentFixture<GraphPanelComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [GraphPanelComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
