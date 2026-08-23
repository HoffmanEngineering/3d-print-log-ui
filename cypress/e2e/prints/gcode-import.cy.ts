/**
 * Importing a slicer's G-code is the app's signature entry point - it is what
 * turns "log your prints" into something you do in two clicks - and it had no
 * e2e coverage. AGENTS.md lists five parsers under `core/services/file-parsers`
 * and each has unit tests over a gcode string, but nothing covered the path the
 * user actually takes: pick a file, have it read and dispatched to the right
 * parser, stashed in `NewPrintStoreService`, and handed to the edit form by a
 * resolver on a different route. Every one of those seams is invisible to a
 * parser unit test.
 *
 * The fixtures are trimmed to the smallest files that still exercise the real
 * code path. `detectSlicerFromGcode` dispatches on a comment marker, and the
 * PrusaSlicer parser reads only `; key = value` comments, so a short file is
 * genuinely representative rather than a mock.
 */
describe('Gcode import', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/prints');
  });

  // The input is `display: none` and driven by a menu item, so `force` is how
  // Cypress reaches it. The menu path itself is covered separately below.
  const selectGcode = (fixture: string, fileName: string) =>
    cy
      .get('#files')
      .selectFile(
        { contents: `cypress/fixtures/gcode/${fixture}`, fileName },
        { force: true }
      );

  it('turns a PrusaSlicer file into a prefilled new print', () => {
    selectGcode('prusaslicer_benchy.gcode', 'benchy_test.gcode');

    // The parse hands off to a different route through NewPrintStoreService.
    cy.location('pathname').should('eq', '/prints/new/edit');

    // The title is derived from the file name, not read out of the gcode:
    // snake_cased, split, the "gcode" segment dropped, each word capitalized.
    cy.get('#edit-print-title').should('have.value', 'Benchy Test');
    cy.get('#edit-print-file-name').should('have.value', 'benchy_test.gcode');

    // Read out of the file: `; estimated printing time (normal mode) = 2h 15m 30s`.
    cy.get('#edit-print-estimated-print-time')
      .invoke('val')
      .should('match', /2\s*h/i);

    // `parseSettingsIntoNotes` prefixes anything it recognised with this
    // heading, so its presence means settings were actually extracted rather
    // than the form simply opening empty.
    cy.get('#edit-print-notes')
      .invoke('val')
      .should('contain', 'Print Settings:');
  });

  it('reaches the same import from the Add New Print menu', () => {
    // Proves the hidden input is actually wired to a control the user can find,
    // which the forced `selectFile` above deliberately bypasses.
    cy.get('#menu').click();
    cy.findByRole('menuitem', { name: /add print from gcode/i }).should(
      'be.visible'
    );

    // Closing the menu rather than clicking through: the click opens the OS
    // file picker, which Cypress cannot drive.
    cy.get('body').type('{esc}');

    selectGcode('prusaslicer_benchy.gcode', 'menu_route.gcode');
    cy.location('pathname').should('eq', '/prints/new/edit');
    cy.get('#edit-print-title').should('have.value', 'Menu Route');
  });

  it('saves an imported print with the values the parser extracted', () => {
    const fileName = `imported_${new Date().getTime()}.gcode`;

    cy.intercept('POST', '**/api/Prints/').as('createPrint');
    selectGcode('prusaslicer_benchy.gcode', fileName);

    cy.location('pathname').should('eq', '/prints/new/edit');

    // A printer is the one thing gcode cannot supply, so it stays a user
    // choice - and the print will not save without it.
    cy.get('#edit-print-printer').click();
    cy.get('mat-option').first().click();
    cy.get('#edit-print-submit-btn').click();

    // Asserted on the payload: the point is that what the parser extracted
    // survives the form and reaches the API, not merely that a print was made.
    cy.wait('@createPrint').then(({ request, response }) => {
      expect(request.body.fileName).to.eq(fileName);
      expect(
        request.body.estimatedPrintTimeInSeconds,
        '2h 15m 30s in seconds'
      ).to.eq(8130);
      expect(response.statusCode).to.be.oneOf([200, 201]);
    });
  });

  it('still opens a new print for a slicer it does not recognise', () => {
    selectGcode('unknown_slicer_cube.gcode', 'mystery_cube.gcode');

    // No parser claims this file, so it takes the generic-viewer branch. That
    // branch must still deliver the user to a usable new print rather than
    // dead-ending on `/prints` with nothing to show for the upload.
    //
    // The "Parsing Gcode" dialog that branch opens is deliberately not asserted:
    // it is a progress dialog that closes as soon as the read finishes, and on
    // a fixture this small that is faster than a Cypress query can reliably
    // catch. Asserting it would buy a race, not coverage.
    cy.location('pathname').should('eq', '/prints/new/edit');

    // The file name is the one thing the app can always recover without a
    // parser, so it is what proves this file - not a leftover from an earlier
    // test - is what opened the form.
    cy.get('#edit-print-file-name').should('have.value', 'mystery_cube.gcode');
    cy.get('#edit-print-title').should('have.value', 'Mystery Cube');
  });
});
