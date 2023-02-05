// This file is required by karma.conf.js and loads recursively all the .spec and framework files
import 'zone.js/testing'; // zone-testing needs to come before any other import

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, NoopAnimationsModule],
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } }
);
