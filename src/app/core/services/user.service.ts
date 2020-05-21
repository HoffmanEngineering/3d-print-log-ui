import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ImageResizerService,
  IResizeImageOptions,
} from './image-resizer.service';

export enum ProfileViewStatus {
  Public = 1,
  Unlisted = 2,
  Friends = 3,
  Private = 4,
}

export interface UserSummaryDto {
  id: number;
  /**
   * The URL of the user's profile picture
   */
  profilePicture: string;

  /**
   * The URL of the user's cover picture
   */
  coverPicture: string;

  displayName: string;
}

export interface UserDetailDto {
  id: number;
  /**
   * The URL of the user's profile picture
   */
  profilePicture: string;

  /**
   * The URL of the user's cover picture
   */
  coverPicture: string;

  displayName: string;

  bio: string;

  viewStatus: ProfileViewStatus;
}

export interface UpdateUserDetailDto {
  /**
   * The URL of the user's profile picture
   */
  profilePicture: string;

  /**
   * The URL of the user's cover picture
   */
  coverPicture: string;

  displayName: string;

  bio: string;

  viewStatus: ProfileViewStatus;
}

export interface UserUrlDto {
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/Users`;
  IMAGE_MAX_SIZE_PX = 1080;
  constructor(
    private http: HttpClient,
    private imageResizer: ImageResizerService
  ) {}

  getUserSummary(id: number) {
    const url = `${this.baseApiUrl}/${id}/summary`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    return this.http.get<UserSummaryDto>(url, { headers });
  }

  getCurrentUserDetail() {
    const url = `${this.baseApiUrl}/me`;
    return this.http.get<UserDetailDto>(url);
  }

  getUserDetail(id: number) {
    const url = `${this.baseApiUrl}/${id}`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http.get<UserDetailDto>(url, { headers });
  }

  updateCurrentUserDetail(newUserDetail: UpdateUserDetailDto) {
    const url = `${this.baseApiUrl}/me`;
    return this.http.put<UserDetailDto>(url, newUserDetail);
  }

  updateCurrentUserProfilePicture(file: File) {
    const url = `${this.baseApiUrl}/me/profile-image`;

    const settings: IResizeImageOptions = {
      file,
      maxSize: this.IMAGE_MAX_SIZE_PX,
    };

    return from(this.imageResizer.resizeImage(settings)).pipe(
      switchMap((reducedImage) => {
        const formData: FormData = new FormData();
        formData.append('image', reducedImage, file.name);

        return this.http
          .post<UserUrlDto>(url, formData)
          .pipe(map((result) => result.url));
      })
    );
  }

  updateCurrentUserCoverPicture(file: File) {
    const url = `${this.baseApiUrl}/me/cover-image`;

    const settings: IResizeImageOptions = {
      file,
      maxSize: this.IMAGE_MAX_SIZE_PX,
    };

    return from(this.imageResizer.resizeImage(settings)).pipe(
      switchMap((reducedImage) => {
        const formData: FormData = new FormData();
        formData.append('image', reducedImage, file.name);

        return this.http
          .post<UserUrlDto>(url, formData)
          .pipe(map((result) => result.url));
      })
    );
  }
}
