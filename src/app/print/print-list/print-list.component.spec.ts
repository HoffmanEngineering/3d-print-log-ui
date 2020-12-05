import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LoggingService } from 'src/app/core/services/logging.service';

import { PrintListComponent } from './print-list.component';

xdescribe('PrintListComponent', () => {
  let component: PrintListComponent;
  let fixture: ComponentFixture<PrintListComponent>;

  beforeEach(
    waitForAsync(() => {
      const mockLogger = jasmine.createSpyObj<LoggingService>(
        'LoggingService',
        ['logException', 'logEvent']
      );

      TestBed.configureTestingModule({
        declarations: [PrintListComponent],
        providers: [{ provide: LoggingService, useValue: mockLogger }],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
