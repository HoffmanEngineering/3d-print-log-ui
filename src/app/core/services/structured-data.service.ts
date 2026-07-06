import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);
  private readonly elementId = 'ld-json';

  /**
   * Injects (or replaces) a single <script type="application/ld+json"> in <head>
   * wrapping the given schema nodes in a Schema.org @graph. An empty array removes
   * any existing tag. SSR-safe: uses the injected DOCUMENT so it also runs during
   * prerendering.
   */
  public setJsonLd(nodes: Record<string, unknown>[]): void {
    let script = this.document.getElementById(
      this.elementId
    ) as HTMLScriptElement | null;

    if (!nodes || nodes.length === 0) {
      script?.remove();
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.id = this.elementId;
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': nodes,
    });
  }
}
