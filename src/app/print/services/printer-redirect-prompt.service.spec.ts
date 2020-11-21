import { TestBed } from '@angular/core/testing';

import { PrinterRedirectPromptService } from './printer-redirect-prompt.service';

xdescribe('PrinterRedirectPromptService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrinterRedirectPromptService = TestBed.inject(
      PrinterRedirectPromptService
    );
    expect(service).toBeTruthy();
  });
});
