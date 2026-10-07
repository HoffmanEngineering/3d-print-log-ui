import {
  Component,
  ElementRef,
  OnInit,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { Comment } from 'src/app/core/services/comment.service';
import { PrintService } from 'src/app/core/services/print.service';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-print-comments',
  templateUrl: './print-comments.component.html',
  styleUrls: ['./print-comments.component.scss'],
  imports: [SharedModule],
})
export class PrintCommentsComponent implements OnInit {
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

  public currentUserProfilePicture = '';
  public currentUserId: number | null = null;
  public newComment = '';

  public isLoggedIn = false;

  constructor(
    private readonly authService: AuthService,
    private readonly printService: PrintService,
    private readonly toastrService: ToastrService
  ) {}

  public ngOnInit(): void {
    this.authService.userProfile$.subscribe((user) => {
      if (user) {
        this.isLoggedIn = true;
      }
      this.currentUserProfilePicture = user?.profilePicture ?? '';
      this.currentUserId = user?.id;
    });
  }

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
