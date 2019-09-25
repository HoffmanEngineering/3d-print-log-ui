import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class UserService {
  constructor(private http: HttpClient) {}

  ping$(): Observable<any> {
    return this.http.get<any>("https://localhost:44378/api/Prints");
  }
}
