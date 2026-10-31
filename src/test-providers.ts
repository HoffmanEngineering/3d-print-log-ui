import { EnvironmentProviders, Provider } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

/** Providers every spec's TestBed starts with (angular.json `providersFile`). */
const providers: (Provider | EnvironmentProviders)[] = [
  provideNoopAnimations(),
];

export default providers;
