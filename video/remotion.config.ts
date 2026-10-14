import { Config } from '@remotion/cli/config';

// three.js needs WebGL. "angle" uses the GPU where there is one; on a GPU-less machine
// (CI, a cloud container) run with REMOTION_GL=swangle, ANGLE over SwiftShader.
Config.setChromiumOpenGlRenderer(
  (process.env.REMOTION_GL as 'angle' | 'swangle') ?? 'angle'
);
// PNG, not JPEG: with JPEG frame capture the WebGL canvas comes out washed out (a second
// sRGB curve lands on it, and the bump detail flattens), while DOM layers look normal.
// Stills don't show it; only `remotion render` does.
Config.setVideoImageFormat('png');
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 2));
if (process.env.REMOTION_BROWSER)
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
