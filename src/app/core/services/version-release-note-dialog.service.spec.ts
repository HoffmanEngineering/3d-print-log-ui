import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { VersionReleaseNoteDialogService } from './version-release-note-dialog.service';

describe('VersionReleaseNoteDialogService', () => {
  let service: VersionReleaseNoteDialogService;

  beforeEach(() => {
    const mockMatDialog = jasmine.createSpyObj<MatDialog>('MatDialog', [
      'open',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: mockMatDialog }],
    });
    service = TestBed.inject(VersionReleaseNoteDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
