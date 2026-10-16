const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes user text for HTML built as a string, such as a `SimpleDialogData.body`, which is
 * rendered with `[innerHtml]`. Angular's sanitizer strips scripts, not markup, so an unescaped
 * spool name like `<b>Bold</b>` would still render as bold.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
