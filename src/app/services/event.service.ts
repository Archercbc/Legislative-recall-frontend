import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly apiUrl = environment.apiUrl + '/api/events';

  constructor(private http: HttpClient) { }

  // 獲取事件詳細信息，支持時間範圍參數
  getEventDetailWithTimeRange(eventName: string, timeRange: string): Observable<any> {
    const params = new URLSearchParams({
      time_range: timeRange
    });
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(eventName)}/data?${params.toString()}`);
  }

  // 獲取事件詳細信息，支持天數參數
  getEventDetailWithDays(eventName: string, days: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(eventName)}/data?days=${days}`);
  }

  // 獲取事件基本信息
  getEventDetail(eventName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(eventName)}`);
  }

  // 獲取事件統計數據
  getEventStats(eventName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(eventName)}/stats`);
  }

  // 獲取事件原始數據
  getEventRawData(eventName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(eventName)}/raw-data`);
  }
}
