import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The trust links every docs page carries: who runs the site, how to reach
 * them, and what data it keeps (#213). They live in the layout rather than in
 * a page so the prerendered HTML of every docs page links them.
 *
 * The template is deliberately static, with a literal `href` beside each
 * `routerLink`: the prerendered docs layout is serialized before its bindings
 * are evaluated (see #230), so anything bound, including an `@for` or the
 * `href` RouterLink writes, would be missing from the static HTML a crawler
 * reads. RouterLink still takes over the click in the browser.
 */
@Component({
  selector: 'app-doc-site-footer',
  templateUrl: './doc-site-footer.component.html',
  styleUrls: ['./doc-site-footer.component.scss'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocSiteFooterComponent {}
