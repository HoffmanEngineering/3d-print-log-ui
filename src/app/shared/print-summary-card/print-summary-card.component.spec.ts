import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrintService } from 'src/app/core/services/print.service';
import { SharedModule } from '../shared.module';
import {
  PrintSummaryCardComponent,
  PrintSummaryCardPrint,
} from './print-summary-card.component';

describe('PrintSummaryCardComponent', () => {
  const print: PrintSummaryCardPrint = {
    id: 12,
    title: 'Benchy',
    startDate: new Date(2026, 0, 15),
    defaultPrintImageId: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [
        provideRouter([]),
        {
          provide: PrintService,
          useValue: jasmine.createSpyObj<PrintService>('PrintService', [
            'getPrintImage',
          ]),
        },
      ],
    }).compileComponents();
  });

  const render = (
    inputs: Record<string, unknown>
  ): ComponentFixture<PrintSummaryCardComponent> => {
    const fixture = TestBed.createComponent(PrintSummaryCardComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  };

  it('links the title to the print', () => {
    const el: HTMLElement = render({ print }).nativeElement;

    const link = el.querySelector('mat-card-title a') as HTMLAnchorElement;
    expect(link.textContent.trim()).toBe('Benchy');
    expect(link.getAttribute('href')).toBe('/prints/12');
  });

  it('credits and links the printer when one is given', () => {
    const el: HTMLElement = render({
      print,
      userId: 4,
      userName: 'maker',
      userProfilePictureUrl: 'https://example.com/me.png',
    }).nativeElement;

    const byline = el.querySelector('mat-card-subtitle') as HTMLElement;
    expect(byline.textContent).toContain('Printed by');
    expect(byline.querySelector('a')!.getAttribute('href')).toBe('/users/4');
    expect(el.querySelector('img[mat-card-avatar]')!.getAttribute('src')).toBe(
      'https://example.com/me.png'
    );
  });

  it('omits the byline and avatar without a user', () => {
    const el: HTMLElement = render({ print }).nativeElement;

    expect(el.querySelector('mat-card-subtitle')!.textContent).not.toContain(
      'Printed by'
    );
    expect(el.querySelector('img[mat-card-avatar]')).toBeNull();
  });
});
