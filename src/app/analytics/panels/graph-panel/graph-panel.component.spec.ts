import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphPanelComponent } from './graph-panel.component';

describe('GraphPanelComponent', () => {
  let component: GraphPanelComponent;
  let fixture: ComponentFixture<GraphPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GraphPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
