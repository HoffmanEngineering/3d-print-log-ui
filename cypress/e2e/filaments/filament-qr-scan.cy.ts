import * as qrcodeModule from 'qrcode';
import { apiUrl } from '../../support/api-url';
import { installFakeCamera } from '../../support/fake-camera';

// Picking a material by QR scan takes a different path than picking it from the
// list: the list hands back the API's own summary, while the scan looks the
// material up by id and maps the detail onto a summary. That mapping used to
// drop the server-computed remaining values, so a scanned spool showed
// "0 (g) remaining" on the print it was attached to.
// `qrcode` is CommonJS: depending on the bundler the namespace object is either
// the module itself or a wrapper with the real API under `.default`. The app's
// own QrCodeService unwraps it the same way.
const QRCode =
  (qrcodeModule as { default?: typeof qrcodeModule }).default ?? qrcodeModule;

describe('Print edit — selecting a material by QR scan', () => {
  const NOMINAL_WEIGHT_MG = 1000000; // 1,000 g, so "1,000 (g) remaining" is unambiguous

  beforeEach(() => {
    cy.login();
  });

  // Seeded through the API rather than the UI: the spec needs a spool with a
  // known remaining weight and a known id (the id is what goes in the QR code).
  function seedTrackedFilament(): Cypress.Chainable<{
    id: string;
    displayName: string;
  }> {
    const displayName = `QR Scan E2E ${Date.now()}`;

    return cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/api/Filaments/`,
        headers: { 'X-Dev-User-Id': '1' },
        body: {
          displayName,
          brand: 'E2E',
          materialCategoryNickname: 'filament',
          materialType: 'PLA',
          materialDensityGramPerCubicCm: 1.24,
          colorName: 'Scan Blue',
          colorHex: '0000FF',
          colorPattern: 0,
          colors: ['0000FF'],
          finishType: 0,
          effects: [],
          diameterMm: 1.75,
          initialTotalWeightMg: NOMINAL_WEIGHT_MG,
          initialNominalWeightMg: NOMINAL_WEIGHT_MG,
          spoolWeightMg: 200000,
          source: 0,
          isActive: true,
          purchasePriceValue: '20.00',
          purchasePriceCurrency: 'USD',
          filamentAdjustments: [],
        },
      })
      .then((response) => ({ id: response.body.id, displayName }));
  }

  function openPrintEditWithCamera(filamentId: string) {
    const labelUrl = `https://localhost:4200/materials/${filamentId}`;

    return cy
      .wrap(QRCode.toDataURL(labelUrl, { margin: 4, width: 512 }), {
        log: false,
      })
      .then((qrDataUrl) => {
        cy.visit('/prints/new/edit', {
          onBeforeLoad: (win) => installFakeCamera(win, qrDataUrl as string),
        });
      });
  }

  it('keeps the remaining amounts on a material selected by scanning its label', () => {
    seedTrackedFilament().then(({ id, displayName }) => {
      openPrintEditWithCamera(id);

      cy.get('#edit-print-title').type(`QR scan print ${Date.now()}`);
      cy.get('#edit-print-printer').click();
      cy.get('mat-option').first().click();

      cy.get('#add-new-filament-usage-btn').click();
      cy.get('[data-cy="select-filament-btn"]').first().click();

      // Switch the picker from the list to the scanner and let the real decoder
      // read the fake camera. Decoding a stream takes longer than a click, so
      // the wait for the lookup is generous.
      cy.get('app-filament-search-modal').should('be.visible');
      cy.intercept('GET', `**/api/Filaments/${id}`).as('filamentLookup');
      cy.get('.scan-toggle-button').click();
      cy.get('#qr-reader video', { timeout: 20000 }).should('exist');
      cy.wait('@filamentLookup', { timeout: 30000 });

      // The dialog closes itself once the scanned material is chosen.
      cy.get('app-filament-search-modal').should('not.exist');

      cy.get('.filament-entry-card')
        .first()
        .should('contain.text', displayName)
        .invoke('text')
        .should((text) => {
          expect(text).to.match(/1,000\s*\(g\) remaining/);
          expect(text).to.match(/[1-9][\d,]*\s*\(m\) remaining/);
          expect(text).to.match(/[1-9][\d,]*\s*\(ml\) remaining/);
        });
    });
  });
});
