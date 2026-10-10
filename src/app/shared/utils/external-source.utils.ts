/**
 * Names for the connectors that log prints, keyed by the API's lower-case `externalSource` (on a
 * print) or `kind` (on a connection). The bridge uses the bare connector name; the legacy
 * integrations carry their own sources so their prints stay distinguishable from the bridge's.
 */
const SOURCE_LABELS: Record<string, string> = {
  moonraker: 'Klipper (Moonraker)',
  octoprint: 'OctoPrint',
  'moonraker-notifier': 'Moonraker notifier',
  'octoprint-webhook': 'OctoPrint webhook',
  'bambu-cloud': 'Bambu Cloud',
  mcp: 'AI assistant (MCP)',
};

/** A readable name for a connector, or the raw value for one this build does not know yet. */
export function externalSourceLabel(source: string): string {
  return SOURCE_LABELS[source.trim().toLowerCase()] ?? source;
}
