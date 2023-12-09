import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export class MetaTag {
  name: string;
  value: string;
  isFacebook: boolean;

  constructor(name: string, value: string, isFacebook: boolean) {
    this.name = name;
    this.value = value;
    this.isFacebook = isFacebook;
  }
}

@Injectable({
  providedIn: 'root',
})
export class MetaTagService {
  private readonly description: string = 'description';
  private readonly urlMeta: string = 'og:url';
  private readonly titleMeta: string = 'og:title';
  private readonly facebookDescriptionMeta: string = 'og:description';
  private readonly imageMeta: string = 'og:image';
  private readonly secureImageMeta: string = 'og:image:secure_url';
  private readonly twitterTitleMeta: string = 'twitter:text:title';
  private readonly twitterImageMeta: string = 'twitter:image';

  constructor(
    private titleService: Title,
    private metaService: Meta
  ) {}

  public setTitle(title: string): void {
    this.titleService.setTitle(title);
  }

  public setSocialMediaTags(
    url: string,
    title: string,
    description: string,
    imageUrl: string
  ): void {
    const tags = [
      new MetaTag(this.description, description, false),
      new MetaTag(this.urlMeta, url, true),
      new MetaTag(this.titleMeta, title, true),
      new MetaTag(this.facebookDescriptionMeta, description, true),
      new MetaTag(this.imageMeta, imageUrl, true),
      new MetaTag(this.secureImageMeta, imageUrl, true),
      new MetaTag(this.twitterTitleMeta, title, false),
      new MetaTag(this.twitterImageMeta, imageUrl, false),
    ];
    this.setTags(tags);
  }

  private setTags(tags: MetaTag[]): void {
    tags.forEach((siteTag) => {
      const tag = siteTag.isFacebook
        ? this.metaService.getTag(`property='${siteTag.name}'`)
        : this.metaService.getTag(`name='${siteTag.name}'`);
      if (siteTag.isFacebook) {
        this.metaService.updateTag({
          property: siteTag.name,
          content: siteTag.value,
        });
      } else {
        this.metaService.updateTag({
          name: siteTag.name,
          content: siteTag.value,
        });
      }
    });
  }
}
