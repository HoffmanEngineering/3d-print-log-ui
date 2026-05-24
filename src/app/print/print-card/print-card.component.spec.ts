import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { PrintCardComponent } from './print-card.component';
import {
  PrintSummary,
  PrintStatus,
  PrintFilamentSourceMeasurement,
} from 'src/app/core/services/print.service';
import { LoggingService } from 'src/app/core/services/logging.service';

const mockPrint: PrintSummary = {
  id: 42,
  title: 'Benchy Test Print',
  printer: { id: 1, name: 'Voron', make: 'Voron Design', model: '2.4' } as any,
  startDate: new Date('2026-04-01'),
  status: PrintStatus.Success,
  defaultPrintImageId: 0,
  createdByUserId: 1,
  estimatedPrintTimeInSeconds: 3600,
  printTimeInSeconds: 3500,
  sumActualFilamentWeightMg: 15000,
  sumEstimatedFilamentWeightMg: 14000,
  totalFilamentWeightMg: 15000,
  filamentUsage: [],
  commentCount: 0,
};

describe('PrintCardComponent', () => {
  let component: PrintCardComponent;
  let fixture: ComponentFixture<PrintCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintCardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('print', mockPrint);
    fixture.detectChanges();
  });

  it('should render the print title', () => {
    const title = fixture.debugElement.query(By.css('.card-title'));
    expect(title.nativeElement.textContent.trim()).toBe('Benchy Test Print');
  });

  it('should render the printer label', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Voron - (Voron Design 2.4)');
  });

  it('should show the correct status text', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Success');
  });

  it('should emit deleted output when delete is triggered', () => {
    const deletedSpy = jasmine.createSpy('deleted');
    component.deleted.subscribe(deletedSpy);
    component.onDeleteClicked();
    expect(deletedSpy).toHaveBeenCalledWith(mockPrint);
  });

  it('should emit statusChanged when changeStatus is called', () => {
    const spy = jasmine.createSpy('statusChanged');
    component.statusChanged.subscribe(spy);
    component.onStatusChange(PrintStatus.Failed);
    expect(spy).toHaveBeenCalledWith({ id: 42, status: PrintStatus.Failed });
  });
});

describe('PrintCardComponent — preferred unit', () => {
  let component: PrintCardComponent;
  let fixture: ComponentFixture<PrintCardComponent>;

  function makeMinimalPrint(filamentOverrides: any = {}) {
    return {
      id: 1,
      title: 'Test Print',
      printer: {
        id: 1,
        name: 'Test Printer',
        make: 'Make',
        model: 'Model',
      } as any,
      startDate: new Date().toISOString(),
      status: 1,
      defaultPrintImageId: null,
      createdByUserId: 1,
      estimatedPrintTimeInSeconds: null,
      printTimeInSeconds: null,
      sumActualFilamentWeightMg: 0,
      sumEstimatedFilamentWeightMg: 0,
      totalFilamentWeightMg: 0,
      commentCount: 0,
      filamentUsage: [
        {
          id: 'fu1',
          filament: {
            id: 1,
            displayName: 'PLA',
            colorName: null,
            colors: [],
            colorPattern: null,
            finishType: null,
            effects: null,
          },
          amountMg: 15000,
          lengthInM: 0,
          volumeMl: 0,
          estimatedAmountMg: 0,
          estimatedLengthInM: 0,
          estimatedVolumeMl: 0,
          source: PrintFilamentSourceMeasurement.Weight,
          estimatedSource: PrintFilamentSourceMeasurement.Weight,
          notes: null,
          ...filamentOverrides,
        },
      ],
    } as any;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintCardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintCardComponent);
    component = fixture.componentInstance;
  });

  it('shows weight when preferredUnit=Weight and amountMg is set', async () => {
    fixture.componentRef.setInput('print', makeMinimalPrint());
    fixture.componentRef.setInput(
      'preferredUnit',
      PrintFilamentSourceMeasurement.Weight
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('15.0g');
  });

  it('shows length when preferredUnit=Length and lengthInM is set', async () => {
    fixture.componentRef.setInput(
      'print',
      makeMinimalPrint({
        amountMg: 0,
        lengthInM: 8.4,
        source: PrintFilamentSourceMeasurement.Length,
      })
    );
    fixture.componentRef.setInput(
      'preferredUnit',
      PrintFilamentSourceMeasurement.Length
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('8.4m');
  });
});
