import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { YouTubePlayerModule } from '@angular/youtube-player';

/**
 * An embedded walkthrough video with a caption.
 *
 * ```html
 * <doc-video
 *   videoId="E3kHsxSkBAw"
 *   title="Setting up the OctoPrint webhook"
 * />
 * ```
 *
 * `<youtube-player>` on its own is a fixed 640x390 box that overflows a phone,
 * and it carries no accessible name — a screen reader announces the embed as an
 * unlabelled frame. This wraps it in a 16:9 box that scales with the measure and
 * gives it a title, so a doc page cannot ship a video that does neither.
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
}
