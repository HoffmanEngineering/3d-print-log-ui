import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintImageComponent } from './print-image.component';

describe('PrintImageComponent', () => {
  let component: PrintImageComponent;
  let fixture: ComponentFixture<PrintImageComponent>;

  beforeEach(
    waitForAsync(() => {
      const mockPrintService = jasmine.createSpyObj<PrintService>(
        'PrintService',
        { getPrintImage: of('') }
      );

      TestBed.configureTestingModule({
        declarations: [PrintImageComponent],
        providers: [{ provide: PrintService, useValue: mockPrintService }],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
