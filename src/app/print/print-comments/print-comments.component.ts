import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { Comment } from 'src/app/core/services/comment.service';

@Component({
  selector: 'app-print-comments',
  templateUrl: './print-comments.component.html',
  styleUrls: ['./print-comments.component.scss'],
})
export class PrintCommentsComponent implements OnInit {
  @Input() comments: Comment[];
  @Input() allowComments: boolean;

  @Output() addNewComment = new EventEmitter<string>();

  @ViewChild('newCommentTextArea', { static: false })
  newCommentTextArea: ElementRef;

  @ViewChild('notLoggedIn', { static: false })
  notLoggedIn: ElementRef;

  public currentUserProfilePicture = '';
  public newComment = '';

  public isLoggedIn = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.userProfile$.subscribe((user) => {
      if (user) {
        this.isLoggedIn = true;
      }
      this.currentUserProfilePicture = user?.profilePicture ?? '';
    });
  }

  addComment() {
    if (this.newComment !== '') {
      this.addNewComment.emit(this.newComment);
      this.newComment = '';
    }
  }

  scrollToReply() {
    if (this.newCommentTextArea) {
      this.newCommentTextArea.nativeElement.scrollIntoView();
      this.newCommentTextArea.nativeElement.focus();
    } else if (this.notLoggedIn) {
      this.notLoggedIn.nativeElement.scrollIntoView();
    }
  }
}
