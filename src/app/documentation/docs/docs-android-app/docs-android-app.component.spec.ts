import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsAndroidAppComponent } from './docs-android-app.component';

describe('DocsReleaseNotesComponent', () => {
  let component: DocsAndroidAppComponent;
  let fixture: ComponentFixture<DocsAndroidAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsAndroidAppComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsAndroidAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
