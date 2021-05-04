import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Comment } from 'src/app/core/services/comment.service';

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
})
export class CommentComponent implements OnInit {
  @Input() comment: Comment;

  @Input() public showDelete = false;

  @Output() public delete: EventEmitter<void> = new EventEmitter();

  constructor() {}

  ngOnInit(): void {}
}
