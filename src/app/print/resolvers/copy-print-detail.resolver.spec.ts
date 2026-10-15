import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintService,
} from 'src/app/core/services/print.service';
import {
  resolveValue,
  routeSnapshot,
} from 'src/app/core/resolvers/testing/run-resolver';
import { copyPrintDetailResolver } from './copy-print-detail.resolver';

describe('copyPrintDetailResolver', () => {
  let printService: jasmine.SpyObj<PrintService>;

  const original = {
    id: 7,
    title: 'Benchy',
    images: [
      { id: 1, isDefault: false },
      { id: 2, isDefault: true },
    ],
    filamentUsage: [{ id: 'usage-1', filamentId: 'f1' }],
  } as unknown as PrintDetail;

  const copyOf = (id: string) =>
    resolveValue(copyPrintDetailResolver, routeSnapshot({ params: { id } }));

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintDetail',
      'getPrintImage',
    ]);
    printService.getPrintDetail.and.returnValue(of(original));
    printService.getPrintImage.and.callFake((_printId, imageId) =>
      of(`data:image/${imageId}`)
    );
    TestBed.configureTestingModule({
      providers: [{ provide: PrintService, useValue: printService }],
    });
  });

  it('copies the print as a new print with no user', async () => {
    const copy = await copyOf('7');

    expect(printService.getPrintDetail).toHaveBeenCalledOnceWith(7);
    expect(copy.print!.title).toBe('Benchy');
    expect(copy.print!.id).toBeNull();
    expect(copy.user).toBeNull();
  });

  it('re-uploads the images by value, keeping order and the default', async () => {
    const copy = await copyOf('7');

    expect(copy.print!.images).toEqual([
      { id: null, isDefault: false, url: 'data:image/1', displayOrder: 0 },
      { id: null, isDefault: true, url: 'data:image/2', displayOrder: 1 },
    ] as unknown as PrintDetail['images']);
  });

  it('gives each filament usage row a new id', async () => {
    const copy = await copyOf('7');

    expect(copy.print!.filamentUsage).toEqual([
      { id: EMPTY_GUID, filamentId: 'f1' },
    ] as unknown as PrintDetail['filamentUsage']);
  });

  it('copies a print with no images without fetching any', async () => {
    printService.getPrintDetail.and.returnValue(
      of({ ...original, images: [] } as PrintDetail)
    );

    const copy = await copyOf('7');

    expect(copy.print!.images).toEqual([]);
    expect(printService.getPrintImage).not.toHaveBeenCalled();
  });

  it('resolves an empty detail when the id is not a number', async () => {
    await expectAsync(copyOf('abc')).toBeResolvedTo({
      print: null,
      user: null,
    });
    expect(printService.getPrintDetail).not.toHaveBeenCalled();
  });
});
