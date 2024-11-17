import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsSlic3rUploaderComponent } from './docs-slic3r-uploader.component';

describe('DocsSlic3rUploaderComponent', () => {
  let component: DocsSlic3rUploaderComponent;
  let fixture: ComponentFixture<DocsSlic3rUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsSlic3rUploaderComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsSlic3rUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
