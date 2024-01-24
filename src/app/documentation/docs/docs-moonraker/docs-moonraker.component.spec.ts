import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsMoonrakerComponent } from './docs-moonraker.component';

describe('DocsMoonrakerComponent', () => {
  let component: DocsMoonrakerComponent;
  let fixture: ComponentFixture<DocsMoonrakerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsMoonrakerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsMoonrakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
