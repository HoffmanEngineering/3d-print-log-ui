import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { ColumnDefinition } from '../print-list.component';

import {
  DialogData,
  PrintTableLayoutComponent,
} from './print-table-layout.component';

describe('PrintTableLayoutComponent', () => {
  let changes: string[][];
  let dialogRef: jasmine.SpyObj<MatDialogRef<PrintTableLayoutComponent>>;

  const columns = ['title', 'printer', 'status', 'date'].map(
    (key) => ({ key }) as ColumnDefinition
  );

  const open = (currentColumns: string[]) => {
    const changeEvent = new Subject<string[]>();
    changeEvent.subscribe((c) => changes.push(c));
    TestBed.configureTestingModule({
      declarations: [PrintTableLayoutComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Columns',
            allPossibleColumns: columns,
            currentColumns,
            defaultColumns: ['title', 'status'],
            changeEvent,
          } as DialogData,
        },
        { provide: ToastrService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    TestBed.overrideTemplate(PrintTableLayoutComponent, '');
    const component = TestBed.createComponent(
      PrintTableLayoutComponent
    ).componentInstance;
    component.ngOnInit();
    return component;
  };

  const keys = (component: PrintTableLayoutComponent) =>
    component.allColumns.map((c) => c.key);

  beforeEach(() => {
    changes = [];
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  it('lists the shown columns in the order the table shows them', () => {
    const component = open(['status', 'title', 'more']);

    expect(keys(component).indexOf('status')).toBeLessThan(
      keys(component).indexOf('title')
    );
    expect(component.selectedColumns).toEqual(['status', 'title', 'more']);
  });

  it('ignores a saved column that is no longer offered', () => {
    expect(keys(open(['retired-column', 'title', 'status']))).toEqual([
      'title',
      'printer',
      'status',
      'date',
    ]);
  });

  it('ignores a saved column that is no longer offered after the others', () => {
    expect(keys(open(['title', 'status', 'retired-column']))).toEqual([
      'title',
      'printer',
      'status',
      'date',
    ]);
  });

  it('reorders the shown columns when one is moved', () => {
    const component = open(['title', 'status']);

    component.moveDown(0);

    expect(keys(component)).toEqual(['printer', 'title', 'status', 'date']);
    expect(changes).toEqual([['title', 'status']]);

    component.moveDown(1);

    expect(changes.at(-1)).toEqual(['status', 'title']);
  });

  it('puts back the columns it opened with and closes', () => {
    const component = open(['title', 'status']);
    component.moveDown(0);
    component.moveDown(1);

    component.resetSelection();

    expect(changes.at(-1)).toEqual(['title', 'status']);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('restores the default columns', () => {
    const component = open(['date']);

    component.resetToDefaults();

    expect(component.selectedColumns).toEqual(['title', 'status']);
    expect(changes.at(-1)).toEqual(['title', 'status']);
  });
});
