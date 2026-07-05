export interface SlicerConfig {
  route: string; // e.g. 'orcaslicer'
  title: string; // <title>
  metaDescription: string;
  h1: string;
  intro: string;
  steps: string[]; // 3-5 short steps
  uniqueHook?: string; // required for Tier 3 fork pages
  downloadUrl: string; // GitHub release or Cura Marketplace
  downloadLabel: string;
  docsRoute: string; // internal /docs route for the full guide
  hubRoute?: string; // Tier 3 -> '/orcaslicer'
  relatedForks?: { route: string; name: string }[]; // hub -> forks
}

const SITE = 'https://www.3dprintlog.com';
export const siteUrl = (route: string) => `${SITE}/${route}`;
export const ogImage = `${SITE}/assets/3d-print-log-logo_8b178eb1339b.svg`;

export const SLICER_CONFIGS: Record<string, SlicerConfig> = {
  orcaslicer: {
    route: 'orcaslicer',
    title: 'Track Prints from OrcaSlicer | 3D Print Log',
    metaDescription:
      'Automatically log every OrcaSlicer print in 3D Print Log. Send print time, filament usage, and settings straight from OrcaSlicer. Free.',
    h1: 'Log 3D Prints from OrcaSlicer',
    intro:
      'OrcaSlicer and its vendor forks can send every print to 3D Print Log automatically using our post-processing uploader.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In OrcaSlicer, open Process settings and add the uploader as a post-processing script.',
      'Slice and print. Your print time, filament usage, and settings are logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
  },
};
