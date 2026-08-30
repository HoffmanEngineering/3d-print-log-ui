import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { YouTubePlayerModule } from '@angular/youtube-player';

/**
 * An embedded walkthrough video with a caption.
 *
 * ```html
 * <doc-video
 *   videoId="E3kHsxSkBAw"
 *   title="Setting up the OctoPrint webhook"
 * ></doc-video>
 * ```
 *
 * `<youtube-player>` on its own is a fixed 640x390 box that overflows a phone,
 * and it carries no accessible name — a screen reader announces the embed as an
 * unlabelled frame. This wraps it in a 16:9 box that scales with the measure and
 * names it, so a doc page cannot ship a video that does neither.
 *
 * Note the closing tag in the example: a multi-line self-closing tag is not a
 * shape the Markdown renderer's raw HTML block reader accepts.
 */
@Component({
  selector: 'doc-video',
  templateUrl: './doc-video.component.html',
  styleUrls: ['./doc-video.component.scss'],
  imports: [YouTubePlayerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocVideoComponent {
  readonly videoId = input.required<string>();

  /** What the video shows. Used as the player's accessible name and caption. */
  readonly title = input.required<string>();

  /**
   * Names the iframe the YouTube API builds.
   *
   * `placeholderButtonLabel` only names the play button on the poster image.
   * Once the reader clicks it, that placeholder is replaced by an iframe the
   * API creates, which carries YouTube's own generic title — so the embed the
   * reader is actually left with is the unlabelled one. `ready` fires only in
   * the browser, after the API has built the frame, which is the one moment
   * this can be set.
   */
  labelFrame(event: YT.PlayerEvent): void {
    event.target.getIframe().title = this.title();
  }
}
