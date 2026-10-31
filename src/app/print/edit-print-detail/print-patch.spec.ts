import {
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintStatus,
  PrintViewStatus,
} from 'src/app/core/services/print.service';
import { buildPrintPatch } from './print-patch';

type EditablePrint = Omit<PrintDetail, 'comments'>;

const usageRow = {
  id: 'a3f1c2d4-0000-4000-8000-000000000001',
  filament: {
    id: 'f-1',
  } as unknown as PrintDetail['filamentUsage'][number]['filament'],
  slot: 2,
  estimatedAmountMg: 20000,
  estimatedLengthInM: null,
  estimatedVolumeMl: null,
  estimatedSource: PrintFilamentSourceMeasurement.Weight,
  amountMg: null,
  lengthInM: null,
  volumeMl: null,
  source: PrintFilamentSourceMeasurement.Weight,
  notes: '',
};

function loadedPrint(overrides: Partial<EditablePrint> = {}): EditablePrint {
  return {
    id: 5,
    title: 'Benchy',
    printerId: 1,
    startDate: new Date('2026-10-10T12:00:00Z'),
    estimatedPrintTimeInSeconds: 3600,
    estimatedFilamentUsageMg: null,
    printTimeInSeconds: null,
    filamentUsageMg: null,
    filamentType: null,
    filamentUsage: [usageRow],
    notes: 'first layer was fine',
    url: 'https://example.com/benchy',
    fileName: 'benchy.gcode',
    status: PrintStatus.Printing,
    viewStatus: PrintViewStatus.Private,
    allowComments: true,
    allowFileDownloads: false,
    createdByUserId: null,
    images: [],
    projectId: 'project-1',
    ...overrides,
  };
}

describe('buildPrintPatch', () => {
  it('is empty when nothing changed', () => {
    expect(buildPrintPatch(loadedPrint(), loadedPrint())).toEqual({});
  });

  it('sends only the field the user changed', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({ notes: 'added a note' })
    );

    expect(patch).toEqual({ notes: 'added a note' });
  });

  it('never sends status or usage the user did not touch', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({ title: 'Benchy v2' })
    );

    expect('status' in patch).toBe(false);
    expect('filamentUsage' in patch).toBe(false);
    expect('printTimeInSeconds' in patch).toBe(false);
  });

  it('sends each changed scalar field', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({
        title: 'Benchy v2',
        status: PrintStatus.Success,
        printerId: 2,
        viewStatus: PrintViewStatus.Public,
        allowComments: false,
        allowFileDownloads: true,
        estimatedPrintTimeInSeconds: 7200,
        printTimeInSeconds: 3500,
        url: 'https://example.com/v2',
        fileName: 'benchy-v2.gcode',
        projectId: 'project-2',
      })
    );

    expect(patch).toEqual({
      title: 'Benchy v2',
      status: PrintStatus.Success,
      printerId: 2,
      viewStatus: PrintViewStatus.Public,
      allowComments: false,
      allowFileDownloads: true,
      estimatedPrintTimeInSeconds: 7200,
      printTimeInSeconds: 3500,
      url: 'https://example.com/v2',
      fileName: 'benchy-v2.gcode',
      projectId: 'project-2',
    });
  });

  it('puts cleared fields in clear instead of sending null', () => {
    const patch = buildPrintPatch(
      loadedPrint({ printTimeInSeconds: 3500 }),
      loadedPrint({
        startDate: null,
        estimatedPrintTimeInSeconds: null,
        printTimeInSeconds: null,
        notes: '',
        url: '',
        fileName: '',
        projectId: undefined,
      })
    );

    expect(patch).toEqual({
      clear: [
        'startDate',
        'estimatedPrintTimeInSeconds',
        'printTimeInSeconds',
        'notes',
        'url',
        'fileName',
        'projectId',
      ],
    });
  });

  it('treats an empty string and a missing value as the same', () => {
    const patch = buildPrintPatch(
      loadedPrint({ notes: null, url: null, fileName: null }),
      loadedPrint({ notes: '', url: '', fileName: '' })
    );

    expect(patch).toEqual({});
  });

  it('sends a changed start date', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({ startDate: new Date('2026-10-11T08:30:00Z') })
    );

    expect(patch).toEqual({ startDate: new Date('2026-10-11T08:30:00Z') });
  });

  it('ignores the sub-second precision the form cannot show', () => {
    const patch = buildPrintPatch(
      loadedPrint({ startDate: new Date('2026-10-10T12:00:00.734Z') }),
      loadedPrint({ startDate: new Date('2026-10-10T12:00:00Z') })
    );

    expect(patch).toEqual({});
  });

  it('compares a start date string from the API with the form date', () => {
    const patch = buildPrintPatch(
      loadedPrint({
        startDate: '2026-10-10T12:00:00+00:00' as unknown as Date,
      }),
      loadedPrint({ startDate: new Date('2026-10-10T12:00:00Z') })
    );

    expect(patch).toEqual({});
  });

  it('sends every usage row when one row was edited', () => {
    const edited = { ...usageRow, amountMg: 21500 };
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({ filamentUsage: [edited] })
    );

    expect(patch.filamentUsage).toEqual([
      {
        id: usageRow.id,
        filamentId: 'f-1',
        slot: 2,
        estimatedAmountMg: 20000,
        estimatedLengthInM: null,
        estimatedVolumeMl: null,
        estimatedSource: PrintFilamentSourceMeasurement.Weight,
        amountMg: 21500,
        lengthInM: null,
        volumeMl: null,
        source: PrintFilamentSourceMeasurement.Weight,
        actualIsEstimate: false,
        notes: '',
      },
    ]);
  });

  // api#282: PATCH replaces every usage row and resets actualIsEstimate unless it is sent back.
  describe('actualIsEstimate (printlog-bridge#82)', () => {
    const estimatedRow = {
      ...usageRow,
      amountMg: 18000,
      actualIsEstimate: true,
    };
    const otherRow = {
      ...usageRow,
      id: 'a3f1c2d4-0000-4000-8000-000000000002',
      slot: 3,
      amountMg: 4000,
      actualIsEstimate: true,
    };

    it('sends the flag back on rows the user did not change', () => {
      const patch = buildPrintPatch(
        loadedPrint({ filamentUsage: [estimatedRow, otherRow] }),
        loadedPrint({
          filamentUsage: [estimatedRow, { ...otherRow, notes: 'tray B1' }],
        })
      );

      expect(patch.filamentUsage?.map((r) => r.actualIsEstimate)).toEqual([
        true,
        true,
      ]);
    });

    it('sends a row whose actual amount the user changed as measured', () => {
      const patch = buildPrintPatch(
        loadedPrint({ filamentUsage: [estimatedRow, otherRow] }),
        loadedPrint({
          filamentUsage: [{ ...estimatedRow, amountMg: 17250 }, otherRow],
        })
      );

      expect(patch.filamentUsage?.map((r) => r.actualIsEstimate)).toEqual([
        false,
        true,
      ]);
    });

    it('sends a row whose measure the user switched as measured', () => {
      const patch = buildPrintPatch(
        loadedPrint({ filamentUsage: [estimatedRow] }),
        loadedPrint({
          filamentUsage: [
            {
              ...estimatedRow,
              source: PrintFilamentSourceMeasurement.Length,
              lengthInM: 6.1,
            },
          ],
        })
      );

      expect(patch.filamentUsage?.[0].actualIsEstimate).toBe(false);
    });

    it('sends a measured row as measured', () => {
      const patch = buildPrintPatch(
        loadedPrint({ filamentUsage: [{ ...usageRow, amountMg: 3000 }] }),
        loadedPrint({
          filamentUsage: [{ ...usageRow, amountMg: 3000, notes: 'x' }],
        })
      );

      expect(patch.filamentUsage?.[0].actualIsEstimate).toBe(false);
    });

    it('sends nothing when only the flag would be resent', () => {
      expect(
        buildPrintPatch(
          loadedPrint({ filamentUsage: [estimatedRow] }),
          loadedPrint({ filamentUsage: [estimatedRow] })
        )
      ).toEqual({});
    });
  });

  it('sends an empty usage list when every row was removed', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({ filamentUsage: [] })
    );

    expect(patch).toEqual({ filamentUsage: [] });
  });

  it('treats a different filament object with the same id as unchanged', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({
        filamentUsage: [
          {
            ...usageRow,
            filament: {
              id: 'f-1',
              name: 'Galaxy Black',
            } as unknown as PrintDetail['filamentUsage'][number]['filament'],
          },
        ],
      })
    );

    expect(patch).toEqual({});
  });

  it('never sends the read-only or legacy fields', () => {
    const patch = buildPrintPatch(
      loadedPrint(),
      loadedPrint({
        filamentType: 'PLA',
        filamentUsageMg: 12000,
        estimatedFilamentUsageMg: 15000,
        externalSource: 'moonraker',
        curaSettingId: 'setting-1',
      })
    );

    expect(patch).toEqual({});
  });
});
