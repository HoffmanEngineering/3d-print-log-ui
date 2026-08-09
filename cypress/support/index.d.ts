declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>;
    createPrint(title: string, options?: { printer?: string }): Chainable<void>;
    openFilterPanel(): Chainable<void>;
    seedPublicPrintFixture(): Chainable<any>;
    checkA11yWithReport(
      context?: any,
      options?: import('axe-core').RunOptions & {
        includedImpacts?: string[];
      }
    ): Chainable<void>;
  }
}
