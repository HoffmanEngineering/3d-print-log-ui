/**
 * Copy for the /klipper landing page (#259). Every claim here is backed by the
 * printlog-bridge docs (src/content/docs/printlog-bridge*.md); change them
 * together.
 */
export interface KlipperFeature {
  heading: string;
  body: string;
}

export interface KlipperGuide {
  route: string;
  label: string;
  summary: string;
}

export interface KlipperLanding {
  route: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  features: KlipperFeature[];
  steps: string[];
  guides: KlipperGuide[];
  planned: string[];
}

export const BRIDGE_REPO_URL =
  'https://github.com/HoffmanEngineering/printlog-bridge';

export const KLIPPER_LANDING: KlipperLanding = {
  route: 'klipper',
  title: 'Automatic Print Logging for Klipper | 3D Print Log',
  metaDescription:
    'Log every Klipper and Moonraker print to 3D Print Log automatically: outcome, print time, filament per tool, slicer thumbnail, webcam snapshot and spools.',
  h1: 'Automatic print logging for Klipper',
  intro:
    'printlog-bridge watches your Klipper printers through Moonraker and logs every print to 3D Print Log by itself. Start a print from Mainsail, Fluidd or the printer’s screen and it shows up in your print history, with nothing to type in.',
  features: [
    {
      heading: 'Every print, start to finish',
      body: 'A print appears as Printing the moment it starts. When it ends, the bridge records whether it finished, was cancelled or failed, and how long it took.',
    },
    {
      heading: 'Filament per tool',
      body: 'The filament Klipper actually fed is logged per tool, so toolchangers, IDEX printers and the Snapmaker U1 get one usage row for each extruder.',
    },
    {
      heading: 'Pictures without trying',
      body: 'The slicer thumbnail becomes the print’s picture when it starts, and a frame from the printer’s webcam is added when it ends, if a webcam is set up.',
    },
    {
      heading: 'Spools stay current',
      body: 'Usage is linked to the spool loaded in each tool. Assign spools from Klipper’s console with the PRINTLOG_SET_SPOOL macros, or let the Snapmaker U1 read them from their RFID tags.',
    },
    {
      heading: 'Nothing lost offline',
      body: 'Each event is written to an outbox on disk before it is sent. If the internet or 3D Print Log is down, the bridge catches up once the connection is back.',
    },
    {
      heading: 'On the printer or in Docker',
      body: 'Run it as a service on the printer’s own host, or in Docker on a NAS, home server or Raspberry Pi, where one bridge can watch several printers.',
    },
  ],
  steps: [
    'Add your printer on the Printers page in 3D Print Log and create a personal API key.',
    'Install printlog-bridge on the printer’s host, or run it in Docker on another computer on your network.',
    'Put the API key in the bridge’s config and start it.',
    'Print as usual. Each print is logged when it starts and updated when it ends.',
  ],
  guides: [
    {
      route: '/docs/printlog-bridge-install',
      label: 'Install on the printer',
      summary: 'Local mode, as a service on the printer’s host.',
    },
    {
      route: '/docs/printlog-bridge-docker',
      label: 'Run it in Docker',
      summary: 'Remote mode, on a NAS, home server or Pi.',
    },
    {
      route: '/docs/printlog-bridge-spools',
      label: 'Assign spools',
      summary: 'The PRINTLOG_SET_SPOOL macros, by spool id or tag.',
    },
    {
      route: '/docs/snapmaker-u1',
      label: 'Snapmaker U1',
      summary: 'Four tools, with spools read from their RFID tags.',
    },
  ],
  planned: [
    'One-step pairing: confirm the printer in 3D Print Log instead of copying an API key.',
  ],
};
