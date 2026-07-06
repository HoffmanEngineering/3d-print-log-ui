import { SlicerConfig } from '../../slicer/slicer-configs';

export function buildSlicerHowTo(
  config: SlicerConfig
): Record<string, unknown> {
  return {
    '@type': 'HowTo',
    name: config.h1,
    description: config.intro,
    step: config.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s,
      text: s,
    })),
  };
}
