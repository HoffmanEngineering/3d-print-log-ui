import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Comment } from 'src/app/core/services/comment.service';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardSubtitle,
  MatCardContent,
} from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';
import { DefaultFlexDirective } from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { LocaleDatePipe } from '../../pipes/locale-date.pipe';
import { HumanizePipe } from '../../pipes/humanize.pipe';

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatCardSubtitle,
    RouterLink,
    MatTooltip,
    DefaultFlexDirective,
    MatButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatCardContent,
    LocaleDatePipe,
    HumanizePipe,
  ],
})
export class CommentComponent {
  comment = input.required<Comment>();
  showDelete = input<boolean>(false);
  delete = output<void>();
}
