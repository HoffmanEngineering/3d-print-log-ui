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
  cura: {
    route: 'cura',
    title: 'Track Prints from Ultimaker Cura | 3D Print Log',
    metaDescription:
      'Automatically log every Cura print in 3D Print Log. Send print time, filament usage, and settings straight from Ultimaker Cura. Free.',
    h1: 'Log 3D Prints from Ultimaker Cura',
    intro:
      'The 3D Print Log plugin for Ultimaker Cura sends your print details and settings to 3D Print Log when you save a project.',
    steps: [
      'Open the Cura Marketplace and install the 3D Print Log plugin.',
      'Sign in to 3D Print Log from the plugin.',
      'Slice and save. Your print is logged with its settings automatically.',
    ],
    downloadUrl:
      'https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader',
    downloadLabel: 'Get the plugin on the Cura Marketplace',
    docsRoute: '/docs/cura-plugin',
  },
  prusaslicer: {
    route: 'prusaslicer',
    title: 'Track Prints from PrusaSlicer | 3D Print Log',
    metaDescription:
      'Automatically log every PrusaSlicer print in 3D Print Log. Send print time, filament usage, and settings straight from PrusaSlicer. Free.',
    h1: 'Log 3D Prints from PrusaSlicer',
    intro:
      'PrusaSlicer can send every print to 3D Print Log automatically using our post-processing uploader.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In PrusaSlicer, open Print Settings and add the uploader under Output options as a post-processing script.',
      'Slice and print. Your print time, filament usage, and settings are logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
  },
  'bambu-studio': {
    route: 'bambu-studio',
    title: 'Track Prints from Bambu Studio | 3D Print Log',
    metaDescription:
      'Automatically log every Bambu Studio print in 3D Print Log. Send print time, filament usage, and settings straight from Bambu Studio. Free.',
    h1: 'Log 3D Prints from Bambu Studio',
    intro:
      'Bambu Studio can send every print to 3D Print Log automatically using our post-processing uploader.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In Bambu Studio, open the Others tab in Process settings and add the uploader as a post-processing script.',
      'Slice and print. Your print time, filament usage, and settings are logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
  },
  'creality-print': {
    route: 'creality-print',
    title: 'Track Prints from Creality Print | 3D Print Log',
    metaDescription:
      'Automatically log every Creality Print job in 3D Print Log. Send print time, filament usage, and settings straight from Creality Print. Free.',
    h1: 'Log 3D Prints from Creality Print',
    intro:
      'Creality Print can send every print to 3D Print Log automatically using our post-processing uploader.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In Creality Print, add the uploader as a post-processing script in your print settings.',
      'Slice and print. Your print time, filament usage, and settings are logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
  },
};
