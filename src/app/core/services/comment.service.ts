import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { UserSummaryDto } from './user.service';

export interface Comment {
  id: number;
  body: string;
  createdBy: UserSummaryDto;
  createdById: number;
  createdDate: Date;

  updatedBy: UserSummaryDto;
  updatedById: number;
  updatedDate: Date;
}

export interface EditCommentDto {
  body: string;
}

export interface AddCommentDto {
  body: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  editComment(id: number, body: string) {
    const url = `${this.baseApi}/api/Comments/${id}`;

    const dto: EditCommentDto = {
      body,
    };

    return this.http.put<Comment>(url, dto);
  }
}
