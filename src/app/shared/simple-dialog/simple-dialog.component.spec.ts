import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { SimpleDialogComponent } from './simple-dialog.component';

describe('SimpleDialogComponent', () => {
  let component: SimpleDialogComponent;
  let fixture: ComponentFixture<SimpleDialogComponent>;

  beforeEach(async () => {
    // Deliberately no Material modules here. This dialog is opened programmatically by
    // root-provided services (the release note popup fires at startup), so it must carry its
    // own directive scope — see the styling assertions below.
    await TestBed.configureTestingModule({
      imports: [SimpleDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: [] },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SimpleDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  // Regression: when the component relied on SharedModule for its directive scope, opening it
  // before any lazy feature module had loaded SharedModule rendered a completely unstyled
  // dialog (bare <button>, no padding, default font). Unmatched attribute selectors are not an
  // Angular error, so only the emitted classes prove the directives actually applied.
  it('applies the Material dialog directives without an owning NgModule', () => {
    component.title = 'A title';
    component.body = '<p>Body</p>';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.classList).toContain('mat-mdc-dialog-title');
    expect(el.querySelector('div[mat-dialog-content]')?.classList).toContain(
      'mat-mdc-dialog-content'
    );
    expect(el.querySelector('mat-dialog-actions')?.classList).toContain(
      'mat-mdc-dialog-actions'
    );
  });

  it('applies the Material button directives without an owning NgModule', () => {
    fixture.detectChanges();

    const confirm = (fixture.nativeElement as HTMLElement).querySelector(
      'button[mat-flat-button]'
    );

    expect(confirm?.classList).toContain('mat-mdc-button-base');
  });
});
