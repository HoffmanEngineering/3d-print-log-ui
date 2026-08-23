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

// User settings are stored per user on the API, and every spec in this suite
// runs against the same dev user. A spec that changes a setting therefore
// changes it for every spec that follows, so `settings.cy.ts` snapshots the
// whole set up front and puts it back afterwards.
//
// There is no DELETE on `api/Users/me/user-settings` (see
// UserSettingsController), so a row the spec *creates* cannot be removed - only
// overwritten. These are the closest restorable stand-ins for "absent", and the
// difference is spelled out per setting because it is not uniform: the app does
// NOT treat every empty-ish value the way it treats a missing row.
//
//   '' really is "unset" for the electricity rate, because the cost helper
//   guards with `if (!kwhRate)` (print.service.ts). That guard runs before the
//   wattage is consulted, which is what makes the wattage row harmless too.
//   Note that '0' would NOT work here - it is truthy, so it reads as a
//   configured rate of zero and renders a $0.00 cost where the app previously
//   said "(Electricity rate not set)".
//
//   'USD' / '$' are exactly what settings.component.ts and the currency pipes
//   fall back to when the rows are missing, so those two are truly equivalent.
//
//   The default filament diameter is the one genuine residue: absent leaves the
//   new-material field blank, and there is no value that reproduces that ('' is
//   coerced to 0 by `+setting.value`). 1.75 is chosen as the standard filament
//   diameter and the value the field is most likely to already hold.
const USER_SETTING_FALLBACKS = {
  5: 'USD', // Currency_Name
  6: '$', // Currency_Symbol
  7: '1.75', // Filaments_DefaultDiameterMm - see caveat above
  8: '', // Filaments_DefaultPrice - only drives a placeholder
  12: '', // Electricity_KwhRate - '' reads as unset, '0' does not
  13: '', // Electricity_DefaultWattageW - moot while the rate reads as unset
};

Cypress.Commands.add('snapshotUserSettings', () =>
  cy
    .request({
      method: 'GET',
      url: `${apiUrl()}/api/Users/me/user-settings`,
      headers: { 'X-Dev-User-Id': '1' },
    })
    .then((response) => response.body)
);

Cypress.Commands.add('restoreUserSettings', (snapshot) => {
  const originalById = new Map(snapshot.map((s) => [s.id, s.value]));

  return cy
    .request({
      method: 'GET',
      url: `${apiUrl()}/api/Users/me/user-settings`,
      headers: { 'X-Dev-User-Id': '1' },
    })
    .then((response) => {
      response.body.forEach((setting) => {
        const original = originalById.has(setting.id)
          ? originalById.get(setting.id)
          : USER_SETTING_FALLBACKS[setting.userSettingTypeId];

        // A setting the spec neither changed nor created, and that has no
        // documented fallback, is left exactly as it is.
        if (original === undefined || original === setting.value) {
          return;
        }

        cy.request({
          method: 'PUT',
          url: `${apiUrl()}/api/Users/me/user-settings`,
          headers: { 'X-Dev-User-Id': '1' },
          body: { id: setting.id, value: original },
        });
      });
    });
});

// The dev user's own profile (display name, bio, visibility) is shared state in
// the same way the settings rows are, and `public-profile.cy.ts` has to change
// it to have anything non-trivial to assert on: the seeded user has a null
// display name and no bio, so "the profile rendered" would otherwise be a claim
// about two empty strings.
//
// Reads the public detail endpoint and writes through `me`, which is the only
// endpoint that accepts an update - so this only ever edits the dev user's own
// profile. Passing a previously captured snapshot restores it exactly.
Cypress.Commands.add('patchUserProfile', (patch) => {
  const devHeaders = { 'X-Dev-User-Id': '1' };

  return cy
    .request({
      method: 'GET',
      url: `${apiUrl()}/api/Users/1`,
      headers: devHeaders,
    })
    .then(({ body: current }) =>
      cy
        .request({
          method: 'PUT',
          url: `${apiUrl()}/api/Users/me`,
          headers: devHeaders,
          body: { ...current, ...patch },
        })
        .then((response) => response.body)
    );
});

// Posts a comment on a print as a DIFFERENT dev user, which is what makes the
// API generate a real notification for the print's owner (see
// PrintService.AddComment -> NotificationService.CreateCommentNotifications).
//
// There is no endpoint that creates a notification directly, so this is the
// only way to exercise the notification list against genuine data rather than
// a stubbed response. The dev bypass accepts any user id and the API creates
// the user on first use, so user 2 needs no seeding.
Cypress.Commands.add('commentOnPrintAsOtherUser', (printId, body) =>
  cy
    .request({
      method: 'POST',
      url: `${apiUrl()}/api/Prints/${printId}/comment`,
      headers: { 'X-Dev-User-Id': '2' },
      body: { body },
    })
    .then((response) => response.body)
);

// Creates a print through the API instead of driving the new-print form.
//
// `cy.createPrint` exists to exercise that form, and four specs still use it
// for that. The list specs do not: they need N prints to exist so they can
// filter, select, and bulk-edit them, and paying a page load plus a form fill
// per print made those the two slowest specs in the suite.
//
// The payload mirrors what the form posts for a new print, so a seeded print is
// indistinguishable from a typed one in the list. `status` matters most:
// `PrintStatus.Pending` (1) is what the form defaults to, and the status filter
// and bulk-status tests both assert against prints that are NOT yet Success -
// seeding them as Success would make those assertions pass vacuously.
//
// `viewStatus` and `allowComments` are the form's own fallbacks for a user with
// no saved defaults (Private, comments on). The one deliberate divergence: the
// form would honor a `Prints_DefaultPrintViewStatus` setting if the user had
// one, and this always seeds Private. That keeps seeded rows out of the public
// feed, and no caller so far cares - but a spec that asserts on a seeded
// print's visibility should set it explicitly rather than assume.
Cypress.Commands.add('seedPrint', (title, options = {}) => {
  const devHeaders = { 'X-Dev-User-Id': '1' };

  const findPrinter = () =>
    cy
      .request({
        method: 'GET',
        url: `${apiUrl()}/api/printers/summary?PageNumber=1&PageSize=100`,
        headers: devHeaders,
      })
      .then(({ body }) => {
        const printer = options.printer
          ? body.items.find((p) => p.name === options.printer)
          : body.items[0];

        expect(
          printer,
          options.printer
            ? `a printer named "${options.printer}" exists`
            : 'a printer exists to attach the seeded print to'
        ).to.exist;

        return printer;
      });

  return findPrinter().then((printer) =>
    cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/api/Prints/`,
        headers: devHeaders,
        body: {
          title,
          status: 1, // PrintStatus.Pending - the form's default. See above.
          viewStatus: 3, // PrintViewStatus.Private, so seeded rows stay out of the public feed.
          printerId: printer.id,
          startDate: new Date().toISOString(),
          notes: '',
          url: '',
          fileName: '',
          allowComments: true,
          filamentUsage: [],
        },
      })
      .then((response) => response.body)
  );
});
