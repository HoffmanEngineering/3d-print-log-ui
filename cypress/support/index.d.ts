declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>;
    createPrint(title: string, options?: { printer?: string }): Chainable<void>;
    openFilterPanel(): Chainable<void>;
  }
}
