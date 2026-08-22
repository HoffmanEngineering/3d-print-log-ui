declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>;
    createPrint(title: string, options?: { printer?: string }): Chainable<void>;
    openFilterPanel(): Chainable<void>;
    seedPublicPrintFixture(): Chainable<any>;
    createProject(name: string): Chainable<any>;
    snapshotUserSettings(): Chainable<any[]>;
    restoreUserSettings(snapshot: any[]): Chainable<void>;
    patchUserProfile(patch: Record<string, unknown>): Chainable<any>;
    commentOnPrintAsOtherUser(printId: number, body: string): Chainable<any>;
    checkA11yWithReport(
      context?: any,
      options?: import('axe-core').RunOptions & {
        includedImpacts?: string[];
      }
    ): Chainable<void>;
  }
}
