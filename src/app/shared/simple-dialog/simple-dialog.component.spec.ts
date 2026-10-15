import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

import {
  openSimpleDialog,
  SimpleDialogComponent,
  SimpleDialogData,
} from './simple-dialog.component';

describe('SimpleDialogComponent', () => {
  let fixture: ComponentFixture<SimpleDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SimpleDialogComponent>>;

  function render(data: SimpleDialogData): HTMLElement {
    // Deliberately no Material modules here. This dialog is opened programmatically by
    // root-provided services (the release note popup fires at startup), so it must carry its
    // own directive scope — see the styling assertions below.
    TestBed.configureTestingModule({
      imports: [SimpleDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(SimpleDialogComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function buttons(el: HTMLElement): HTMLButtonElement[] {
    return Array.from(el.querySelectorAll('mat-dialog-actions button'));
  }

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  it('renders the title and body from the dialog data', () => {
    const el = render({ title: 'Delete?', body: '<p>Gone for good</p>' });

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Delete?');
    expect(el.querySelector('div[mat-dialog-content] p')?.textContent).toBe(
      'Gone for good'
    );
  });

  it('omits the heading when the data has no title', () => {
    const el = render({ body: 'Body only' });

    expect(el.querySelector('h1')).toBeNull();
  });

  it('labels the buttons Yes and No by default', () => {
    const el = render({ body: 'Sure?' });

    expect(buttons(el).map((b) => b.textContent?.trim())).toEqual([
      'No',
      'Yes',
    ]);
  });

  it('uses the button labels and colors from the dialog data', () => {
    const el = render({
      body: 'Sure?',
      yesText: 'Delete',
      yesColor: 'warn',
      noText: 'Cancel',
    });

    const [cancel, confirm] = buttons(el);
    expect(cancel.textContent?.trim()).toBe('Cancel');
    expect(confirm.textContent?.trim()).toBe('Delete');
    expect(confirm.classList).toContain('mat-warn');
    expect(cancel.classList).toContain('mat-primary');
  });

  it('hides the dismiss button when noText is empty', () => {
    const el = render({ body: 'Note', yesText: 'Ok', noText: '' });

    expect(buttons(el).map((b) => b.textContent?.trim())).toEqual(['Ok']);
  });

  it('closes without a result when dismissed', () => {
    const el = render({ body: 'Sure?' });

    buttons(el)[0].click();

    expect(dialogRef.close).toHaveBeenCalledOnceWith();
  });

  // Regression: when the component relied on SharedModule for its directive scope, opening it
  // before any lazy feature module had loaded SharedModule rendered a completely unstyled
  // dialog (bare <button>, no padding, default font). Unmatched attribute selectors are not an
  // Angular error, so only the emitted classes prove the directives actually applied.
  it('applies the Material dialog directives without an owning NgModule', () => {
    const el = render({ title: 'A title', body: '<p>Body</p>' });

    expect(el.querySelector('h1')?.classList).toContain('mat-mdc-dialog-title');
    expect(el.querySelector('div[mat-dialog-content]')?.classList).toContain(
      'mat-mdc-dialog-content'
    );
    expect(el.querySelector('mat-dialog-actions')?.classList).toContain(
      'mat-mdc-dialog-actions'
    );
  });

  it('applies the Material button directives without an owning NgModule', () => {
    const el = render({ body: 'Body' });

    expect(el.querySelector('button[mat-flat-button]')?.classList).toContain(
      'mat-mdc-button-base'
    );
  });
});

describe('openSimpleDialog', () => {
  it('opens SimpleDialogComponent with the data and the extra config', () => {
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const ref = {} as MatDialogRef<SimpleDialogComponent, boolean>;
    dialog.open.and.returnValue(ref);

    const result = openSimpleDialog(
      dialog,
      { title: 'Delete?', body: 'Sure?' },
      { maxWidth: '350px' }
    );

    expect(result).toBe(ref);
    expect(dialog.open).toHaveBeenCalledOnceWith(SimpleDialogComponent, {
      maxWidth: '350px',
      data: { title: 'Delete?', body: 'Sure?' },
    });
  });
});
