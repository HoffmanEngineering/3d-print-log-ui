import { mergeConfig } from 'vitest/config';

import base from './vitest-base.config';

// `ng test --configuration coverage` (npm run test:coverage).
//
// The builder runs every spec file in one page by default (isolate: false), as Karma
// did. With coverage on, that run falls apart: about 200 files fail with TestBed
// state left over from another file ("Cannot configure the test module when the test
// module has already been instantiated") and tests time out. A page per file passes,
// at roughly four times the run time, so coverage is a separate, on-demand run.
export default mergeConfig(base, { test: { isolate: true } });
