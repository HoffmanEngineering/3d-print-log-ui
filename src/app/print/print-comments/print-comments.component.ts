import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
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
  @Input() printId: number;
  @Input() printOwnerUserId: number;
  @Input() comments: Comment[];
  @Input() allowComments: boolean;

  @Output() addNewComment = new EventEmitter<string>();

  /**
   * Deletion is reported upward for the same reason `addNewComment` is: the
   * parent owns the comment list as a signal and is OnPush, so removing the row
   * from this component's input array mutates the array without repainting
   * anything.
   */
  @Output() commentDeleted = new EventEmitter<Comment>();

  @ViewChild('newCommentTextArea', { static: false })
  newCommentTextArea: ElementRef;

  @ViewChild('notLoggedIn', { static: false })
  notLoggedIn: ElementRef;

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
    if (this.newCommentTextArea) {
      this.newCommentTextArea.nativeElement.scrollIntoView();
      this.newCommentTextArea.nativeElement.focus();
    } else if (this.notLoggedIn) {
      this.notLoggedIn.nativeElement.scrollIntoView();
    }
  }

  public deleteComment(comment: Comment) {
    this.printService.deletePrintComment(this.printId, comment.id).subscribe(
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
