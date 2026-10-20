import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * One line telling a new user we email them tips and a monthly recap. Presentational only:
 * the host records that the notice was seen (`Email_NoticeSeenAt`) when the user acts.
 */
@Component({
  selector: 'app-inline-email-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inline-email-notice.component.html',
  styleUrl: './inline-email-notice.component.scss',
})
export class InlineEmailNoticeComponent {}
