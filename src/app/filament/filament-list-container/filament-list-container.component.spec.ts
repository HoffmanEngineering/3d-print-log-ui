import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { FilamentListContainerComponent } from './filament-list-container.component';

xdescribe('FilamentListContainerComponent', () => {
  let component: FilamentListContainerComponent;
  let fixture: ComponentFixture<FilamentListContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentListContainerComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              printers: null,
              lastSelectedPrinterSetting: null,
              defaultPrintViewStatusSetting: null,
              print: { print: { printerId: 1, notes: '' } },
            }),
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentListContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
