import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Comment } from 'src/app/core/services/comment.service';

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentComponent {
  readonly comment = input.required<Comment>();
  readonly showDelete = input<boolean>(false);
  delete = output<void>();
}
