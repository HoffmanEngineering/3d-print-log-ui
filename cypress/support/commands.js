// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

// Cypress.Commands.add('login', (overrides = {}) => {
//   Cypress.log({
//     name: 'loginViaAuth0',
//   });

//   const options = {
//     method: 'POST',
//     url: Cypress.env('auth_url'),
//     body: {
//       //   grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
//       //   realm: 'Username-Password-Authentication',
//       grant_type: 'password',
//       username: Cypress.env('auth_username'),
//       password: Cypress.env('auth_password'),
//       audience: Cypress.env('auth_audience'),
//       scope: 'openid profile email',
//       client_id: Cypress.env('auth_client_id'),
//       client_secret: Cypress.env('auth_client_secret'),
//     },
//   };
//   cy.request(options).then((response) => {
//     const token = response.body['access_token'];
//     const expiresIn = response.body['expires_in'];
//     const idToken = response.body['id_token'];
//     const expiresAt = JSON.stringify(expiresIn * 1000 + new Date().getTime());
//     window.localStorage.setItem('expires_at', expiresAt);
//     window.localStorage.setItem('access_token', token);
//     window.localStorage.setItem('id_token', idToken);
//   });
// });

//Cypress.Commands.add('login', (appState = { targetUrl: '/' }) => {
Cypress.Commands.add('login', (targetUrl = '/') => {
  Cypress.log({
    name: 'loginViaAuth0',
  });

  const options = {
    method: 'POST',
    url: Cypress.env('auth_url'),
    body: {
      //   grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      //   realm: 'Username-Password-Authentication',
      grant_type: 'password',
      username: Cypress.env('auth_username'),
      password: Cypress.env('auth_password'),
      audience: Cypress.env('auth_audience'),
      scope: 'openid profile email',
      client_id: Cypress.env('auth_client_id'),
      client_secret: Cypress.env('auth_client_secret'),
    },
  };
  cy.request(options).then(({ body }) => {
    const { access_token, expires_in, id_token } = body;

    cy.server();

    // intercept Auth0 request for token and return what we have
    cy.route({
      url: 'oauth/token',
      method: 'POST',
      response: {
        access_token: access_token,
        id_token: id_token,
        scope: 'openid profile email',
        expires_in: expires_in,
        token_type: 'Bearer',
      },
    });

    // Auth0 SPA SDK will check for value in cookie to get appState
    // and validate nonce (which has been removed for simplicity)
    const stateId = 'test';
    cy.setCookie(
      `a0.spajs.txs.${stateId}`,
      encodeURIComponent(
        JSON.stringify({
          appState: { target: targetUrl },
          scope: 'openid profile email',
          audience: Cypress.env('auth_audience'),
          redirect_uri: 'https://localhost:4200',
        })
      )
    ).then(() => {
      cy.visit(
        `https://localhost:4200/callback/?code=test-code&state=${stateId}`
      );
    });
  });
});
