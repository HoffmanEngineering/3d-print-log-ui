import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';

import { VersionReleaseNoteDialogService } from './version-release-note-dialog.service';

describe('VersionReleaseNoteDialogService', () => {
  let service: VersionReleaseNoteDialogService;
  let mockDialogRef: MatDialogRef<any, any>;

  beforeEach(() => {
    const mockMatDialog = jasmine.createSpyObj<MatDialog>('MatDialog', [
      'open',
    ]);
    mockDialogRef = {
      afterClosed: () => of(),
      componentInstance: {},
    } as unknown as MatDialogRef<any, any>;
    mockMatDialog.open.and.returnValue(mockDialogRef);

    const mockLocalStorage = jasmine.createSpyObj<LocalStorageService>(
      'LocalStorageService',
      ['getItem', 'setItem']
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: mockMatDialog },
        { provide: LocalStorageService, useValue: mockLocalStorage },
      ],
    });
    service = TestBed.inject(VersionReleaseNoteDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it(`should not open the version dialog if the last stored version is equal to the environment's version`, async () => {
    const mockLocalStorage = TestBed.inject(
      LocalStorageService
    ) as jasmine.SpyObj<LocalStorageService>;
    const mockMatDialog = TestBed.inject(
      MatDialog
    ) as jasmine.SpyObj<MatDialog>;

    const currentVersion = environment.version;
    mockLocalStorage.getItem.and.returnValue(currentVersion);

    await service.checkLastLoggedInVersion();

    expect(mockMatDialog.open).not.toHaveBeenCalled();
  });
});
