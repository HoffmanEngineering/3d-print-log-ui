import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GcodeViewerModalComponent } from './gcode-viewer-modal.component';

describe('GcodeViewerModalComponent', () => {
  let component: GcodeViewerModalComponent;
  let fixture: ComponentFixture<GcodeViewerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GcodeViewerModalComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GcodeViewerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
