import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';
import { SeoMetadata } from './seo.service';

/** `og:type`: `article` for prints and projects, `profile` for users, `website` elsewhere. */
export type OgType = 'website' | 'article' | 'profile';

export interface SocialImageDetails {
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export interface SocialTagOptions {
  /** Defaults to `website`. */
  type?: OgType;
  /** Size and alt text of the preview image, written only when known. */
  image?: SocialImageDetails;
}

const SITE_NAME = '3D Print Log';

/** Robots tags the SPA shells ship with (scripts/shell-lib.mjs) and the Worker strips. */
const ROBOTS_NAMES = ['robots', 'googlebot'] as const;

/**
 * Tags an older version of this service wrote, which no crawler reads under these names and
 * the Worker does not write. Removed whenever the social tags are written, so a page never
 * carries both.
 */
const LEGACY_TAGS = [
  "name='twitter:text:title'",
  "property='og:image:secure_url'",
];

/**
 * Writes the document's title and its search and link-preview tags.
 *
 * **The tag names match the Cloudflare Worker** (`cloudflare/seo-worker/src/html.ts`,
 * `headTags`), which writes the same tags into the shell of a public print, project or profile
 * before the app boots. `Meta.updateTag` replaces a tag with the same `name`/`property`, so an
 * update after bootstrap replaces the Worker's tag rather than adding a second one; a name that
 * differed would leave two disagreeing tags in the head. Change both together.
 */
@Injectable({
  providedIn: 'root',
})
export class MetaTagService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /**
   * The robots tags the document was served with, read once when the service is first
   * injected (before any page has changed them). The SPA shells carry `noindex`; a prerendered
   * page, or a public page the Worker rewrote, carries none.
   */
  private readonly shellRobots: Record<string, string | null> =
    Object.fromEntries(
      ROBOTS_NAMES.map((name) => [
        name,
        this.metaService.getTag(`name='${name}'`)?.getAttribute('content') ??
          null,
      ])
    );

  public setTitle(title: string): void {
    this.titleService.setTitle(title);
  }

  public setSeoTags(opts: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    /**
     * The page's Markdown twin (#211), advertised as
     * `<link rel="alternate" type="text/markdown">`. Omitted for a page with
     * no twin, which also clears one left behind by the previous page.
     */
    markdownUrl?: string;
    type?: OgType;
    image?: SocialImageDetails;
  }): void {
    this.setTitle(opts.title); // sets the document <title> (setSocialMediaTags does NOT)
    this.setSocialMediaTags(
      opts.url,
      opts.title,
      opts.description,
      opts.imageUrl,
      { type: opts.type, image: opts.image }
    );
    this.setCanonical(opts.url);
    this.setMarkdownAlternate(opts.markdownUrl);
  }

  /**
   * Describes a public page from the API's `/seo` answer, exactly as the Worker does, and lets
   * it be indexed (a 200 from `/seo` means the page is Public).
   */
  public applySeoMetadata(seo: SeoMetadata): void {
    const image = seo.image;
    const hasSize = !!(image?.width && image?.height);
    this.setSeoTags({
      url: seo.canonicalUrl,
      title: seo.title,
      description: seo.description,
      imageUrl: image?.url ?? '',
      type: seo.type === 'profile' ? 'profile' : 'article',
      image: {
        width: hasSize ? image!.width : null,
        height: hasSize ? image!.height : null,
        alt: image?.alt ?? null,
      },
    });
    this.allowIndexing();
  }

  /** Removes the robots and googlebot tags, as the Worker does for a public page. */
  public allowIndexing(): void {
    for (const name of ROBOTS_NAMES) {
      this.metaService.removeTag(`name='${name}'`);
    }
  }

  /** `noindex` for robots and googlebot: a page that is not public. */
  public preventIndexing(): void {
    for (const name of ROBOTS_NAMES) {
      this.metaService.updateTag({ name, content: 'noindex' });
    }
  }

  /**
   * Puts the robots tags back the way the document was served. A public page calls this when
   * the visitor leaves it, so a page reached afterwards by in-app navigation is not left
   * indexable just because the public page was.
   */
  public restoreShellRobots(): void {
    for (const name of ROBOTS_NAMES) {
      const content = this.shellRobots[name];
      if (content === null) {
        this.metaService.removeTag(`name='${name}'`);
      } else {
        this.metaService.updateTag({ name, content });
      }
    }
  }

  private setMarkdownAlternate(url: string | undefined): void {
    const selector = 'link[rel="alternate"][type="text/markdown"]';
    let link = this.document.querySelector<HTMLLinkElement>(selector);
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('type', 'text/markdown');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * The description, Open Graph and Twitter tags. Optional tags (the image and its size and
   * alt) are removed when not given, so they never describe the previous page.
   */
  public setSocialMediaTags(
    url: string,
    title: string,
    description: string,
    imageUrl: string,
    options: SocialTagOptions = {}
  ): void {
    const { width, height, alt } = options.image ?? {};

    this.set({ name: 'description', content: description });
    this.set({ property: 'og:site_name', content: SITE_NAME });
    this.set({ property: 'og:type', content: options.type ?? 'website' });
    this.set({ property: 'og:title', content: title });
    this.set({ property: 'og:description', content: description });
    this.set({ property: 'og:url', content: url });
    this.setOptional('property', 'og:image', imageUrl);
    this.setOptional(
      'property',
      'og:image:width',
      imageUrl && width && height ? String(width) : null
    );
    this.setOptional(
      'property',
      'og:image:height',
      imageUrl && width && height ? String(height) : null
    );
    this.setOptional('property', 'og:image:alt', imageUrl ? alt : null);
    this.set({
      name: 'twitter:card',
      content: imageUrl ? 'summary_large_image' : 'summary',
    });
    this.set({ name: 'twitter:title', content: title });
    this.set({ name: 'twitter:description', content: description });
    this.setOptional('name', 'twitter:image', imageUrl);
    this.setOptional('name', 'twitter:image:alt', imageUrl ? alt : null);

    for (const selector of LEGACY_TAGS) {
      this.metaService.removeTag(selector);
    }
  }

  private set(tag: MetaDefinition): void {
    this.metaService.updateTag(tag);
  }

  private setOptional(
    attr: 'name' | 'property',
    key: string,
    value: string | null | undefined
  ): void {
    if (value) {
      this.metaService.updateTag({ [attr]: key, content: value });
    } else {
      this.metaService.removeTag(`${attr}='${key}'`);
    }
  }
}
