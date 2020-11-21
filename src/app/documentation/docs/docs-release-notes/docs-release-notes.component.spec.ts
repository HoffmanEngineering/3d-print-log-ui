import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsReleaseNotesComponent } from './docs-release-notes.component';

describe('DocsReleaseNotesComponent', () => {
  let component: DocsReleaseNotesComponent;
  let fixture: ComponentFixture<DocsReleaseNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsReleaseNotesComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsReleaseNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
