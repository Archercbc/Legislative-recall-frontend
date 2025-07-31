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

  // 獲取立委詳細信息，支持時間範圍參數
  getLegislatorDetailWithTimeRange(id: string, timeRange: string): Observable<any> {
    const params = new URLSearchParams({
      time_range: timeRange
    });
    return this.http.get<any>(`${this.apiUrl}/${id}?${params.toString()}`);
  }

  getRecallList() {
    return this.http.get<any[]>(`${this.apiUrl}/recall`);
  }

  // 獲取罷免統計數據
  getRecallStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/recall-stats`);
  }

  // 獲取立委的數據時間範圍
  getLegislatorDateRange(name: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${name}/date-range`);
  }

  // 統一的立委數據API - 支持時間篩選和數據類型選擇
  getLegislatorUnifiedData(
    name: string, 
    options: {
      days?: number;
      includePieChart?: boolean;
      includeTimeSeries?: boolean;
      includeWordCloud?: boolean;
      includeEmotion?: boolean;
    } = {}
  ): Observable<any> {
    const params = new URLSearchParams();
    
    // 設置默認值
    const defaultOptions = {
      days: 365,
      includePieChart: true,
      includeTimeSeries: true,
      includeWordCloud: true,
      includeEmotion: true,
      ...options
    };
    
    // 添加參數
    params.append('days', defaultOptions.days.toString());
    
    if (defaultOptions.includePieChart !== undefined) {
      params.append('include_pie_chart', defaultOptions.includePieChart.toString());
    }
    
    if (defaultOptions.includeTimeSeries !== undefined) {
      params.append('include_time_series', defaultOptions.includeTimeSeries.toString());
    }
    
    if (defaultOptions.includeWordCloud !== undefined) {
      params.append('include_word_cloud', defaultOptions.includeWordCloud.toString());
    }
    
    if (defaultOptions.includeEmotion !== undefined) {
      params.append('include_emotion', defaultOptions.includeEmotion.toString());
    }
    
    return this.http.get(`${this.apiUrl}/${name}/data?${params.toString()}`);
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
