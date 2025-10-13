import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly apiUrl = environment.apiUrl + '/api/legislators';
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getLegislators(county?: string, party?: string): Observable<any[]> {
    let url = this.apiUrl + '/';  // 添加結尾斜線
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


  // 統一的立委數據API - 簡化版本，直接返回全部數據
  getLegislatorUnifiedData(name: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${name}/data`);
  }

}
