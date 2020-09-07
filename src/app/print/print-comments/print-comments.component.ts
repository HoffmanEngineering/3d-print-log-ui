import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { Comment } from 'src/app/core/services/comment.service';

@Component({
  selector: 'app-print-comments',
  templateUrl: './print-comments.component.html',
  styleUrls: ['./print-comments.component.scss'],
})
export class PrintCommentsComponent implements OnInit {
  @Input() comments: Comment[];

  @Output() addNewComment = new EventEmitter<string>();

  public currentUserProfilePicture = '';
  public newComment = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.userProfile$.subscribe((user) => {
      this.currentUserProfilePicture = user.profilePicture || '';
    });
  }

  addComment() {
    if (this.newComment !== '') {
      this.addNewComment.emit(this.newComment);
      this.newComment = '';
    }
  }
}
