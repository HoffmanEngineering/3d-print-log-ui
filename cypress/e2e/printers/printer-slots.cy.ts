import { apiUrl } from '../../support/api-url';

/**
 * Per-slot loaded filament (#255, API #146): a multi-tool printer lists its slots, loads and
 * unloads a spool per slot, and moves a spool between slots. Single-tool printers keep the old
 * list. Needs the API in E2ETesting mode on this feature's branch.
 */
describe('Printer slots', () => {
  const devHeaders = { 'X-Dev-User-Id': '1' };
  const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

  const seedPrinter = (name: string, slotCount: number) =>
    cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/api/Printers`,
        headers: devHeaders,
        body: {
          name,
          make: 'Snapmaker',
          model: 'U1',
          isActive: true,
          category: 'FFF',
          slotCount,
          loadedFilaments: [],
        },
      })
      .then(({ body }) => body.id as number);

  const seedSpool = (displayName: string) =>
    cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/api/Filaments`,
        headers: devHeaders,
        body: {
          displayName,
          brand: 'E2E',
          materialType: 'PLA',
          colorName: 'Green',
          colorHex: '00FF00',
          diameterMm: 1.75,
          initialNominalWeightMg: 1_000_000,
          materialDensityGramPerCubicCm: 1.24,
          isActive: true,
          colors: ['00FF00'],
        },
      })
      .then(({ body }) => body.id as string);

  const slotRow = (label: string) =>
    cy.contains('[data-testid="printer-slot"]', label);

  /** Opens the picker from a slot row and picks the spool by name. */
  const loadInto = (label: string, spoolName: string) => {
    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal');
    slotRow(label).find('[data-testid="slot-load"]').click();
    cy.wait('@getFilamentsModal');
    cy.get('#filament-list-search-input').clear().type(spoolName);
    cy.wait('@getFilamentsModal');
    cy.contains('[data-cy-filament-row]', spoolName).click();
  };

  beforeEach(() => {
    cy.login();
  });

  it('lists every slot of a four-slot printer in order', () => {
    const ts = new Date().getTime();
    seedPrinter(`Slot printer ${ts}`, 4).then((printerId) => {
      cy.visit(`/printers/${printerId}`);
    });

    cy.get('[data-testid="printer-slot"] .slot-label').then((labels) => {
      expect([...labels].map((l) => l.textContent.trim())).to.deep.equal([
        'T0',
        'T1',
        'T2',
        'T3',
      ]);
    });
    cy.contains('button', 'Load Material').should('not.exist');
  });

  it('loads, moves and unloads a spool', () => {
    const ts = new Date().getTime();
    const spoolName = `Slot spool ${ts}`;
    seedSpool(spoolName);
    seedPrinter(`Slot printer ${ts}`, 4).then((printerId) => {
      cy.visit(`/printers/${printerId}`);
    });

    cy.intercept('PUT', '/api/Printers/*/slots/*').as('loadSlot');
    loadInto('T2', spoolName);
    cy.wait('@loadSlot').its('response.statusCode').should('eq', 200);
    slotRow('T2').should('contain.text', spoolName);

    loadInto('T0', spoolName);
    cy.wait('@loadSlot');
    slotRow('T0').should('contain.text', spoolName);
    slotRow('T2').should('contain.text', 'Empty');
    cy.contains(`from T2`).should('be.visible');

    cy.intercept('DELETE', '/api/Printers/*/slots/*').as('unloadSlot');
    slotRow('T0').find('[data-testid="slot-unload"]').click();
    cy.wait('@unloadSlot').its('response.statusCode').should('eq', 204);
    slotRow('T0').should('contain.text', 'Empty');
  });

  it('keeps a loaded slot after the printer form is saved', () => {
    const ts = new Date().getTime();
    const spoolName = `Slot spool ${ts}`;
    const printerName = `Slot printer ${ts}`;
    seedSpool(spoolName);
    seedPrinter(printerName, 4).then((printerId) => {
      cy.visit(`/printers/${printerId}`);

      cy.intercept('PUT', '/api/Printers/*/slots/*').as('loadSlot');
      loadInto('T1', spoolName);
      cy.wait('@loadSlot');

      cy.intercept('PUT', `/api/Printers/${printerId}`).as('savePrinter');
      cy.get('#edit-printer-name').clear().type(`${printerName} renamed`);
      cy.get('#edit-printer-submit-btn').click();
      cy.wait('@savePrinter');

      cy.visit(`/printers/${printerId}`);
    });

    slotRow('T1').should('contain.text', spoolName);
  });

  it('turns a single-tool printer into a multi-slot one from the form', () => {
    const ts = new Date().getTime();
    seedPrinter(`Slot printer ${ts}`, 1).then((printerId) => {
      cy.visit(`/printers/${printerId}`);
      cy.contains('button', 'Load Material').should('be.visible');
      cy.get('[data-testid="printer-slot"]').should('not.exist');

      cy.intercept('PUT', `/api/Printers/${printerId}`).as('savePrinter');
      cy.get('[data-testid="slot-count"]').clear().type('2');
      cy.get('#edit-printer-submit-btn').click();
      cy.wait('@savePrinter').its('request.body.slotCount').should('eq', 2);

      cy.visit(`/printers/${printerId}`);
    });

    cy.get('[data-testid="printer-slot"]').should('have.length', 2);
  });

  it("shows the tool on a print's usage rows", () => {
    const ts = new Date().getTime();
    seedPrinter(`Slot printer ${ts}`, 4).then((printerId) =>
      cy
        .request({
          method: 'POST',
          url: `${apiUrl()}/api/Prints/`,
          headers: devHeaders,
          body: {
            title: `Slot print ${ts}`,
            status: 1,
            viewStatus: 3,
            printerId,
            startDate: new Date().toISOString(),
            notes: '',
            url: '',
            fileName: '',
            allowComments: false,
            filamentUsage: [
              {
                id: EMPTY_GUID,
                filament: null,
                slot: 1,
                source: 2,
                estimatedSource: 2,
                lengthInM: 1.5,
                estimatedLengthInM: 1.5,
                notes: '',
              },
            ],
          },
        })
        .then(({ body }) => cy.visit(`/prints/${body.id}`))
    );

    cy.get('[data-testid="usage-slot"]').should('have.text', 'T1');
    cy.contains('No spool linked').should('be.visible');
  });
});
