import { TestBed } from '@angular/core/testing';

import { PrinterRedirectPromptService } from './printer-redirect-prompt.service';

describe('PrinterRedirectPromptService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrinterRedirectPromptService = TestBed.get(
      PrinterRedirectPromptService
    );
    expect(service).toBeTruthy();
  });
});
