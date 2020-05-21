import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavigatorShareService {
  webNavigator: any = null;
  constructor() {
    this.webNavigator = window.navigator;
  }

  canShare(): boolean {
    return this.webNavigator !== null && this.webNavigator.share !== undefined;
  }

  share({ title, text, url }: { title: string; text?: string; url?: string }) {
    return new Promise(async (resolve, reject) => {
      if (this.webNavigator !== null && this.webNavigator.share !== undefined) {
        if (
          (text === undefined || text === null) &&
          (url === undefined || url === null)
        ) {
          console.warn(
            `Text and url both can't be empty, at least provide either text or url`
          );
        } else {
          try {
            const isShared = await this.webNavigator.share({
              title,
              text,
              url,
            });
            resolve({
              shared: true,
            });
          } catch (error) {
            reject({
              shared: false,
              error,
            });
          }
        }
      } else {
        reject({
          shared: false,
          error: `This service/api is not supported in your Browser`,
        });
      }
    });
  }
}
