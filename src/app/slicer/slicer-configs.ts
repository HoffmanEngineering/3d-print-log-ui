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
  'snapmaker-orca': {
    route: 'snapmaker-orca',
    title: 'Track Prints from Snapmaker Orca | 3D Print Log',
    metaDescription:
      'Automatically log every Snapmaker Orca print in 3D Print Log. Send print time, filament usage, and settings straight from Snapmaker Orca. Free.',
    h1: 'Log 3D Prints from Snapmaker Orca',
    intro:
      'Snapmaker Orca is built on OrcaSlicer, so it works with the same 3D Print Log uploader.',
    uniqueHook:
      'Snapmaker Orca ships tuned for Snapmaker machines such as the Artisan and the J1 IDEX printer. It keeps the OrcaSlicer post-processing workflow, so the uploader script installs the same way it does in OrcaSlicer.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In Snapmaker Orca, add the uploader as a post-processing script under Process settings.',
      'Slice and print. Your print is logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
    hubRoute: '/orcaslicer',
  },
  'anycubic-slicer': {
    route: 'anycubic-slicer',
    title: 'Track Prints from Anycubic Slicer Next | 3D Print Log',
    metaDescription:
      'Automatically log every Anycubic Slicer Next print in 3D Print Log. Send print time, filament usage, and settings straight from Anycubic Slicer Next. Free.',
    h1: 'Log 3D Prints from Anycubic Slicer Next',
    intro:
      'Anycubic Slicer Next is built on OrcaSlicer, so it works with the same 3D Print Log uploader.',
    uniqueHook:
      'Anycubic Slicer Next is the OrcaSlicer-based slicer Anycubic ships for the Kobra 3 and Photon series machines. It keeps the OrcaSlicer post-processing workflow, so the uploader script installs the same way.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In Anycubic Slicer Next, add the uploader as a post-processing script under Process settings.',
      'Slice and print. Your print is logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
    hubRoute: '/orcaslicer',
  },
  'elegoo-slicer': {
    route: 'elegoo-slicer',
    title: 'Track Prints from Elegoo Slicer | 3D Print Log',
    metaDescription:
      'Automatically log every Elegoo Slicer print in 3D Print Log. Send print time, filament usage, and settings straight from Elegoo Slicer. Free.',
    h1: 'Log 3D Prints from Elegoo Slicer',
    intro:
      'Elegoo Slicer is built on OrcaSlicer, so it works with the same 3D Print Log uploader.',
    uniqueHook:
      'Elegoo Slicer ships with Elegoo printers such as the Centauri Carbon. It keeps the OrcaSlicer post-processing workflow, so the uploader script installs the same way.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In Elegoo Slicer, add the uploader as a post-processing script under Process settings.',
      'Slice and print. Your print is logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
    hubRoute: '/orcaslicer',
  },
  'qidi-studio': {
    route: 'qidi-studio',
    title: 'Track Prints from QIDI Studio | 3D Print Log',
    metaDescription:
      'Automatically log every QIDI Studio print in 3D Print Log. Send print time, filament usage, and settings straight from QIDI Studio. Free.',
    h1: 'Log 3D Prints from QIDI Studio',
    intro:
      'QIDI Studio is built on OrcaSlicer, so it works with the same 3D Print Log uploader.',
    uniqueHook:
      'QIDI Studio is the OrcaSlicer-based slicer QIDI ships for its high-speed machines such as the Q1 Pro and the Plus4. It keeps the OrcaSlicer post-processing workflow, so the uploader script installs the same way.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In QIDI Studio, add the uploader as a post-processing script under Process settings.',
      'Slice and print. Your print is logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
    hubRoute: '/orcaslicer',
  },
  'orca-flashforge': {
    route: 'orca-flashforge',
    title: 'Track Prints from Orca-FlashForge | 3D Print Log',
    metaDescription:
      'Automatically log every Orca-FlashForge print in 3D Print Log. Send print time, filament usage, and settings straight from Orca-FlashForge. Free.',
    h1: 'Log 3D Prints from Orca-FlashForge',
    intro:
      'Orca-FlashForge is built on OrcaSlicer, so it works with the same 3D Print Log uploader.',
    uniqueHook:
      'Orca-FlashForge is the OrcaSlicer-based slicer FlashForge ships for machines such as the Adventurer 5M and the AD5X. It keeps the OrcaSlicer post-processing workflow, so the uploader script installs the same way.',
    steps: [
      'Download the 3D Print Log uploader from GitHub.',
      'In Orca-FlashForge, add the uploader as a post-processing script under Process settings.',
      'Slice and print. Your print is logged automatically.',
    ],
    downloadUrl:
      'https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases',
    downloadLabel: 'Download the uploader on GitHub',
    docsRoute: '/docs/slic3r-uploader',
    hubRoute: '/orcaslicer',
  },
};
