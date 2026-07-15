import { ogImage, siteUrl } from '../slicer/slicer-configs';

export interface DocSeo {
  title: string;
  description: string;
}

/**
 * Per-page SEO metadata for the prerendered /docs pages, keyed by full route path.
 * Titles and descriptions must stay globally unique (pooled with marketing routes
 * by scripts/verify-prerender.mjs). Keep keys in sync with DOC_ROUTES in
 * scripts/marketing-routes.mjs.
 */
export const DOC_SEO: Record<string, DocSeo> = {
  'docs/getting-started': {
    title: 'Getting Started | 3D Print Log Docs',
    description:
      'Set up your free 3D Print Log account and log your first print. A quick walkthrough of prints, printers, and materials to get you tracking in minutes.',
  },
  'docs/pro-subscription': {
    title: 'Pro Subscription | 3D Print Log Docs',
    description:
      'Everything included in a 3D Print Log Pro subscription — extra features, higher limits, and how to upgrade, manage, or cancel your plan.',
  },
  'docs/prints': {
    title: 'Tracking Prints | 3D Print Log Docs',
    description:
      'Log every 3D print with photos, filament usage, print time, and settings. Learn how to create, edit, rate, and organize prints in 3D Print Log.',
  },
  'docs/projects': {
    title: 'Projects | 3D Print Log Docs',
    description:
      'Group related prints into projects to track multi-part builds. Learn how to create projects and attach prints in 3D Print Log.',
  },
  'docs/materials': {
    title: 'Filaments & Materials | 3D Print Log Docs',
    description:
      'Manage your filament and material inventory in 3D Print Log — track brands, colors, types, cost, and remaining weight across all your spools.',
  },
  'docs/printers': {
    title: 'Managing Printers | 3D Print Log Docs',
    description:
      'Add and manage your 3D printers in 3D Print Log. Track each machine, its prints, and its maintenance history in one place.',
  },
  'docs/analytics': {
    title: 'Analytics & Statistics | 3D Print Log Docs',
    description:
      'Understand your printing with 3D Print Log analytics — totals, filament usage, print time, cost, and trends across all your prints and printers.',
  },
  'docs/android-app': {
    title: 'Android App | 3D Print Log Docs',
    description:
      'Install and use the 3D Print Log Android app to log prints, manage filament, and check stats from your phone. Setup and feature guide.',
  },
  'docs/mcp': {
    title: 'Connect an AI Assistant (MCP) | 3D Print Log Docs',
    description:
      'Connect Claude or ChatGPT to your 3D Print Log data via the Model Context Protocol. Read your prints, printers, and materials, and log or update prints for you.',
  },
  'docs/cura-plugin': {
    title: 'Cura Plugin | 3D Print Log Docs',
    description:
      'Install the 3D Print Log plugin for Ultimaker Cura to send print time, filament, and settings straight from Cura to your print log.',
  },
  'docs/octoprint-webhook': {
    title: 'OctoPrint Webhook | 3D Print Log Docs',
    description:
      'Connect OctoPrint to 3D Print Log with a webhook so finished prints are logged automatically. Step-by-step configuration guide.',
  },
  'docs/klipper': {
    title: 'Klipper & Moonraker | 3D Print Log Docs',
    description:
      'Automatically log prints from Klipper using Moonraker webhooks. Configure your printer to send completed prints to 3D Print Log.',
  },
  'docs/slic3r-uploader': {
    title: 'OrcaSlicer, PrusaSlicer & Bambu Uploader | 3D Print Log Docs',
    description:
      'Use the post-processing uploader to send prints from OrcaSlicer, PrusaSlicer, and Bambu Studio to 3D Print Log automatically. Setup guide.',
  },
  'docs/release-notes': {
    title: 'Release Notes | 3D Print Log Docs',
    description:
      "What's new in 3D Print Log — the latest features, improvements, and fixes shipped to the app, listed by release.",
  },
  'docs/about': {
    title: 'About 3D Print Log | Docs',
    description:
      'Learn what 3D Print Log is, who it is for, and the story behind the free tool for tracking 3D prints, printers, and filament.',
  },
  'docs/privacy-policy': {
    title: 'Privacy Policy | 3D Print Log Docs',
    description:
      'How 3D Print Log collects, uses, and protects your data. Read the full privacy policy for the 3D Print Log web and mobile apps.',
  },
};

export function getDocSeoTags(path: string): {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
} | null {
  const seo = DOC_SEO[path];
  if (!seo) return null;
  return {
    url: siteUrl(path),
    title: seo.title,
    description: seo.description,
    imageUrl: ogImage,
  };
}
