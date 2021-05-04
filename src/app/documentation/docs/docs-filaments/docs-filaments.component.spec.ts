import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsFilamentsComponent } from './docs-filaments.component';

describe('DocsFilamentsComponent', () => {
  let component: DocsFilamentsComponent;
  let fixture: ComponentFixture<DocsFilamentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsFilamentsComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsFilamentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
