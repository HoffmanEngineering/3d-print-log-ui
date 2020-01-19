import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly baseApiUrl = environment.printLogApiUrl;
  constructor(private http: HttpClient) {}

  ping$(): Observable<any> {
    return this.http.get<any>(`${this.baseApiUrl}/api/Prints/summary`);
  }
}
