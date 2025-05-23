import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = 'http://localhost:5001/api/legislators';

  constructor(private http: HttpClient) { }

  getLegislators(county?: string, party?: string): Observable<any[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    if (county) params.push(`county=${encodeURIComponent(county)}`);
    if (party) params.push(`party=${encodeURIComponent(party)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<any[]>(url);
  }

  getLegislatorDetail(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getRecallList() {
    return this.http.get<any[]>(`${this.apiUrl}/recall`);
  }

  getSentimentData(name: string) {
    return this.http.get<any[]>(`${this.apiUrl}/sentiment/${encodeURIComponent(name)}`);
  }
}
