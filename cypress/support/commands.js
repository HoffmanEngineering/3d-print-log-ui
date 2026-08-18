import { apiUrl } from './api-url';

Cypress.Commands.add('login', () => {
  cy.session('dev-bypass', () => {
    cy.visit('/');
  });
});

Cypress.Commands.add('createPrint', (title, options = {}) => {
  cy.intercept('POST', '/api/Prints/').as('_createPrint');
  cy.visit('/prints/new/edit');
  cy.get('#edit-print-title').type(title);
  cy.get('#edit-print-printer').click();
  if (options.printer) {
    cy.contains('mat-option', options.printer).click();
  } else {
    cy.get('mat-option').first().click();
  }
  cy.get('#edit-print-submit-btn').click();
  cy.wait('@_createPrint');
});

// cy.checkA11y on its own reports only "N accessibility violations were
// detected" in a headless run, which is not actionable. This wrapper prints the
// rule id, impact, and offending selectors to the terminal before failing.
Cypress.Commands.add('checkA11yWithReport', (context, options) => {
  cy.injectAxe();
  cy.checkA11y(context, options, (violations) => {
    cy.task('log', `${violations.length} accessibility violation(s)`);
    cy.task(
      'table',
      violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        targets: v.nodes
          .slice(0, 5)
          .map((n) => n.target.join(' '))
          .join(' | '),
      }))
    );
  });
});

// Creates a PUBLIC print owned by the dev user that carries everything the
// anonymous print-detail assertions need: a filament row with a measured
// amount, a printer, a print time, and a source URL.
//
// Seeded via the API rather than the UI because the dev database is not
// guaranteed to contain any public print with filament usage — and a negative
// assertion like "no filament links are rendered" proves nothing on a print
// that has no filaments to begin with.
//
// Auth is the dev bypass header the app's own AuthInterceptorService sends in
// development (`X-Dev-User-Id`, defaulting to user 1). It only works against a
// dev/e2e API.
Cypress.Commands.add('seedPublicPrintFixture', () => {
  const api = apiUrl();
  const devHeaders = { 'X-Dev-User-Id': '1' };
  const stamp = Date.now();

  const request = (method, path, body) =>
    cy.request({ method, url: `${api}${path}`, headers: devHeaders, body });

  return request('POST', '/api/Filaments/', {
    displayName: `E2E Fixture PLA ${stamp}`,
    brand: 'E2E',
    materialCategoryNickname: 'filament',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    colorName: 'Fixture Red',
    colorHex: 'FF0000',
    colorPattern: 0,
    colors: ['FF0000'],
    finishType: 0,
    effects: [],
    diameterMm: 1.75,
    initialTotalWeightMg: 1000000,
    initialNominalWeightMg: 1000000,
    spoolWeightMg: 200000,
    source: 0,
    isActive: true,
    purchasePriceValue: '20.00',
    purchasePriceCurrency: 'USD',
    filamentAdjustments: [],
  }).then((filamentResp) => {
    const filamentId = filamentResp.body.id;

    return request('GET', '/api/printers/summary?PageNumber=1&PageSize=1').then(
      (printerResp) => {
        const printer = printerResp.body.items[0];
        expect(printer, 'a printer exists to attach to the fixture print').to
          .exist;

        return request('POST', '/api/Prints/', {
          title: `E2E Fixture Public Print ${stamp}`,
          status: 3,
          viewStatus: 1, // PrintViewStatus.Public
          printerId: printer.id,
          startDate: '2026-08-01T00:00:00Z',
          printTimeInSeconds: 7200,
          estimatedPrintTimeInSeconds: 7200,
          notes: '',
          url: 'https://www.printables.com/model/1',
          fileName: 'fixture.gcode',
          allowComments: true,
          filamentUsage: [],
        }).then((createResp) => {
          const created = createResp.body;

          // The create endpoint does not attach a filament to a usage row; the
          // update endpoint does (it posts filamentId). Two calls, not one.
          return request('PUT', `/api/Prints/${created.id}`, {
            ...created,
            printerId: printer.id,
            filamentUsage: [
              {
                filamentId,
                amountMg: 25000,
                source: 1,
                estimatedAmountMg: 24000,
                estimatedSource: 1,
                notes: '',
              },
            ],
          }).then(() =>
            request('GET', `/api/Prints/${created.id}`).then((r) => r.body)
          );
        });
      }
    );
  });
});

// Seeds a project directly through the API so a test can exercise the
// pick-an-existing-project branch without driving the create flow first.
// `status: 1` is ProjectStatus.InProgress and `viewStatus: 3` is
// ProjectViewStatus.Private - the API takes enums as their numeric value.
Cypress.Commands.add('createProject', (name) => {
  return cy
    .request({
      method: 'POST',
      url: `${apiUrl()}/api/Projects`,
      headers: { 'X-Dev-User-Id': '1' },
      body: { name, status: 1, viewStatus: 3 },
    })
    .then((response) => response.body);
});

Cypress.Commands.add('openFilterPanel', () => {
  cy.get('#filter-panel').then(($panel) => {
    if (!$panel.hasClass('filter-panel--open')) {
      cy.get('[aria-controls="filter-panel"]').click();
    }
  });
  cy.get('#filter-panel').should('have.class', 'filter-panel--open');
});
