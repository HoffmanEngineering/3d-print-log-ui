/**
 * `/subscription` is the app's only revenue path and had no e2e coverage at
 * all - not the plan cards, not the checkout hand-off, not the two pages Stripe
 * sends people back to.
 *
 * The interesting part is the hand-off, and it is the part a unit test is least
 * able to hold onto: the component POSTs a plan id, then assigns the returned
 * URL to `window.location.href`. That is a full page navigation out of the
 * Angular router, so what matters is (a) the right plan id goes out and (b) the
 * app actually follows the URL that comes back. Both are asserted here against
 * a stubbed checkout response.
 *
 * Stripe itself is deliberately never contacted. The stub returns a same-origin
 * URL so the redirect stays inside the app and can be observed; a real checkout
 * URL would take the browser off-site and prove nothing about this codebase.
 */
describe('Pro subscription', () => {
  beforeEach(() => {
    cy.login();
  });

  const monthlyButton = () =>
    cy.findByRole('button', { name: /subscribe monthly/i });
  const annualButton = () =>
    cy.findByRole('button', { name: /subscribe annually/i });

  it('presents both plans to a free user', () => {
    cy.visit('/subscription');

    cy.contains('h1', '3D Print Log Pro').should('be.visible');

    cy.contains('.plan-card', 'Monthly').within(() => {
      cy.contains('$2.99').should('be.visible');
      cy.contains(/ad-free experience/i).should('be.visible');
    });

    cy.contains('.plan-card', 'Annual').within(() => {
      cy.contains('$29.99').should('be.visible');
      cy.contains(/save 16%/i).should('be.visible');
    });

    // The "you're already on Pro" card and the plan cards are mutually
    // exclusive branches; asserting the wrong one is absent keeps this test
    // honest about which branch it actually exercised.
    cy.get('.current-plan-card').should('not.exist');
  });

  it('sends the monthly plan id to checkout and follows the URL it gets back', () => {
    cy.intercept('POST', '**/api/Subscription/checkout', {
      statusCode: 200,
      body: { url: '/subscription/success' },
    }).as('checkout');

    cy.visit('/subscription');
    monthlyButton().click();

    cy.wait('@checkout').its('request.body.planId').should('eq', 'pro_monthly');

    // Proves the component honoured the returned URL rather than routing
    // somewhere of its own choosing.
    cy.location('pathname').should('eq', '/subscription/success');
    cy.contains('h1', /welcome to 3d print log pro/i).should('be.visible');
  });

  it('sends the annual plan id to checkout', () => {
    cy.intercept('POST', '**/api/Subscription/checkout', {
      statusCode: 200,
      body: { url: '/subscription/canceled' },
    }).as('checkout');

    cy.visit('/subscription');
    annualButton().click();

    cy.wait('@checkout').its('request.body.planId').should('eq', 'pro_annual');
    cy.location('pathname').should('eq', '/subscription/canceled');
  });

  it('locks both buttons while a checkout is in flight', () => {
    // Delayed so the in-flight window is observable instead of raced. Without
    // the guard the component is under, a double click bills the user twice.
    cy.intercept('POST', '**/api/Subscription/checkout', (req) => {
      req.on('response', (res) => res.setDelay(2000));
      req.reply({ statusCode: 200, body: { url: '/subscription/canceled' } });
    }).as('checkout');

    cy.visit('/subscription');
    monthlyButton().click();

    monthlyButton().should('be.disabled');
    annualButton().should('be.disabled');

    cy.wait('@checkout');
  });

  it('re-enables the buttons when checkout fails instead of stranding the user', () => {
    cy.intercept('POST', '**/api/Subscription/checkout', {
      statusCode: 500,
      body: {},
    }).as('checkout');

    cy.visit('/subscription');
    monthlyButton().click();
    cy.wait('@checkout');

    // Still on the pricing page, and able to try again.
    cy.location('pathname').should('eq', '/subscription');
    monthlyButton().should('not.be.disabled');
    annualButton().should('not.be.disabled');
  });

  it('offers a way back from the canceled page', () => {
    cy.visit('/subscription/canceled');

    cy.contains('h1', /no worries/i).should('be.visible');

    cy.findByRole('button', { name: /view plans/i }).click();
    cy.location('pathname').should('eq', '/subscription');
    cy.contains('h1', '3D Print Log Pro').should('be.visible');
  });

  it('offers a way onward from the success page', () => {
    cy.visit('/subscription/success');

    cy.contains('h1', /welcome to 3d print log pro/i).should('be.visible');

    cy.findByRole('button', { name: /go to my prints/i }).click();
    cy.location('pathname').should('eq', '/prints');
  });
});
