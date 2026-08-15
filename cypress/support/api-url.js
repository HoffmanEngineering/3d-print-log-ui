/**
 * Base URL for direct `cy.request` calls against the API (fixture seeding and
 * side-channel assertions), as opposed to requests the app itself makes.
 *
 * Defaults to the local HTTPS dev API. CI runs both servers on plain HTTP and
 * sets CYPRESS_apiUrl=http://localhost:5000, which Cypress exposes here.
 */
export const apiUrl = () => Cypress.env('apiUrl') ?? 'https://localhost:5001';
