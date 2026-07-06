import { buildSlicerHowTo } from './slicer-schema';
import { SLICER_CONFIGS } from '../../slicer/slicer-configs';

describe('slicer-schema', () => {
  it('buildSlicerHowTo maps steps to positioned HowToStep items', () => {
    const config = SLICER_CONFIGS['orcaslicer'];
    const howto = buildSlicerHowTo(config);
    expect(howto['@type']).toBe('HowTo');
    expect(howto['name']).toBe(config.h1);
    expect(howto['description']).toBe(config.intro);
    const steps = howto['step'] as Array<Record<string, unknown>>;
    expect(steps.length).toBe(config.steps.length);
    expect(steps[0]).toEqual({
      '@type': 'HowToStep',
      position: 1,
      name: config.steps[0],
      text: config.steps[0],
    });
    expect(steps[steps.length - 1]['position']).toBe(config.steps.length);
  });
});
