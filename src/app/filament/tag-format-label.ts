/** A plain-text name for a tag format. No vendor logos: just words. */
export function formatLabel(format: string | null | undefined): string {
  switch (format) {
    case 'snapmaker':
      return 'Snapmaker tag';
    case 'anycubic-ace':
      return 'Anycubic ACE tag';
    case 'openspool':
      return 'OpenSpool tag';
    default:
      return 'Spool tag';
  }
}
