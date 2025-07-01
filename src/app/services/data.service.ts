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

  // 獲取立委在特定時間範圍內的數據
  getLegislatorTimeRangeData(name: string, startDate: string, endDate: string): Observable<any> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });
    return this.http.get(`${this.apiUrl}/${name}/time-range?${params.toString()}`);
  }

  // 獲取立委的完整時間序列數據（詞雲 + 時間變化）
  getLegislatorTimeSeriesData(name: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${name}/time-series`);
  }

  // 獲取立委的數據時間範圍
  getLegislatorDateRange(name: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${name}/date-range`);
  }

  // 獲取網站訪問統計
  getVisitorStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/visitor/stats`);
  }

  // 記錄網站訪問
  recordVisit(page: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/visitor/record`, { page });
  }

  // 初始化訪問計數
  initVisitorStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/visitor/init`);
  }
}
