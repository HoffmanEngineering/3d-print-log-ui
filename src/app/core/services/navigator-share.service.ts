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

  async share({
    title,
    text,
    url,
  }: {
    title: string;
    text?: string;
    url?: string;
  }): Promise<{ shared: boolean }> {
    if (this.webNavigator === null || this.webNavigator.share === undefined) {
      throw {
        shared: false,
        error: `This service/api is not supported in your Browser`,
      };
    }

    if (
      (text === undefined || text === null) &&
      (url === undefined || url === null)
    ) {
      throw {
        shared: false,
        error: `Text and url both can't be empty, at least provide either text or url`,
      };
    }

    try {
      await this.webNavigator.share({ title, text, url });
      return { shared: true };
    } catch (error) {
      throw { shared: false, error };
    }
  }
}
