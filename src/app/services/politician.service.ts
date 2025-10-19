import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PoliticianService {
  private readonly apiUrl = environment.apiUrl + '/api/politicians';

  constructor(private http: HttpClient) { }

  // 獲取政治人物詳細信息，支持時間範圍參數
  getPoliticianDetailWithTimeRange(politicianName: string, timeRange: string): Observable<any> {
    const params = new URLSearchParams({
      time_range: timeRange
    });
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(politicianName)}/data?${params.toString()}`);
  }

  // 獲取政治人物詳細信息，支持天數參數
  getPoliticianDetailWithDays(politicianName: string, days: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(politicianName)}/data?days=${days}`);
  }

  // 獲取政治人物基本信息
  getPoliticianDetail(politicianName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(politicianName)}`);
  }

  // 獲取政治人物統計數據
  getPoliticianStats(politicianName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(politicianName)}/stats`);
  }

  // 獲取政治人物原始數據
  getPoliticianRawData(politicianName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(politicianName)}/raw-data`);
  }

  // 獲取所有政治人物列表
  getAllPoliticians(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/`);
  }

  // 獲取政治人物列表（支持篩選參數）
  getPoliticians(targetType?: string, party?: string): Observable<any[]> {
    let url = `${this.apiUrl}/`;
    const params: string[] = [];
    if (targetType) params.push(`target_type=${encodeURIComponent(targetType)}`);
    if (party) params.push(`party=${encodeURIComponent(party)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<any[]>(url);
  }

  // 統一的政治人物數據API - 參考 legislator 的實現
  getPoliticianUnifiedData(name: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${name}/data`);
  }
}
