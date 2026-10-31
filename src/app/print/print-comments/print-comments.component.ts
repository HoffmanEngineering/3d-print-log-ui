import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { Comment } from 'src/app/core/services/comment.service';
import { PrintService } from 'src/app/core/services/print.service';
import { CommentComponent } from 'src/app/shared/comments/comment/comment.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-print-comments',
  templateUrl: './print-comments.component.html',
  styleUrls: ['./print-comments.component.scss'],
  imports: [
    CommentComponent,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintCommentsComponent {
  private readonly authService = inject(AuthService);
  private readonly printService = inject(PrintService);
  private readonly toastrService = inject(ToastrService);

  readonly printId = input<number>();
  readonly printOwnerUserId = input<number>();
  readonly comments = input<Comment[]>();
  readonly allowComments = input<boolean>();

  readonly addNewComment = output<string>();

  /**
   * Deletion is reported upward for the same reason `addNewComment` is: the
   * parent owns the comment list as a signal and is OnPush, so removing the row
   * from this component's input array mutates the array without repainting
   * anything.
   */
  readonly commentDeleted = output<Comment>();

  readonly newCommentTextArea = viewChild<ElementRef>('newCommentTextArea');

  readonly notLoggedIn = viewChild<ElementRef>('notLoggedIn');

  private readonly user = this.authService.userProfile;

  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly currentUserId = computed(() => this.user()?.id ?? null);
  readonly currentUserProfilePicture = computed(
    () => this.user()?.profilePicture ?? ''
  );

  public newComment = '';

  public addComment() {
    if (this.newComment !== '') {
      this.addNewComment.emit(this.newComment);
      this.newComment = '';
    }
  }

  public scrollToReply() {
    const newCommentTextArea = this.newCommentTextArea();
    const notLoggedIn = this.notLoggedIn();
    if (newCommentTextArea) {
      newCommentTextArea.nativeElement.scrollIntoView();
      newCommentTextArea.nativeElement.focus();
    } else if (notLoggedIn) {
      notLoggedIn.nativeElement.scrollIntoView();
    }
  }

  public deleteComment(comment: Comment) {
    this.printService.deletePrintComment(this.printId(), comment.id).subscribe(
      () => {
        this.toastrService.success('Comment deleted successfully.');

        this.commentDeleted.emit(comment);
      },
      (err) => {
        const message = err?.error ?? err?.message ?? '';
        this.toastrService.error(message);
      }
    );
  }
}
