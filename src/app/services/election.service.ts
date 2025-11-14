import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
// 移除接口導入，直接使用 any 類型
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ElectionService {

  constructor(private http: HttpClient) { }


  /**
   * 獲取選舉分析數據 - 傳遞候選人名單
   */
  getElectionAnalysisData(candidates: string[], days: string = '365'): Observable<any> {
    const candidatesParam = candidates.join(',');
    return this.http.get<any>(`${environment.apiUrl}/api/election/analysis?candidates=${candidatesParam}&days=${days}`).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('無效的API響應');
      }),
      catchError(error => {
        console.error('獲取選舉分析數據失敗:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 獲取特定候選人的時間序列數據 - 使用選舉分析 API
   */
  getCandidateTimeSeriesData(candidateName: string, days: number): Observable<any> {
    // 使用選舉分析 API 獲取單一候選人的數據
    return this.http.get<any>(`${environment.apiUrl}/api/election/analysis?candidates=${encodeURIComponent(candidateName)}&days=${days}`).pipe(
      map(response => {
        if (response.success && response.data) {
          // 返回第一個候選人的數據
          const candidate = response.data.candidates[0];
          if (candidate) {
            return {
              time_series: {
                labels: this.extractLabelsFromTimeSeries(candidate.time_series_stats, days),
                datasets: this.extractDatasetsFromTimeSeries(candidate.time_series_stats, days, candidate.name)
              }
            };
          }
        }
        throw new Error('無效的API響應');
      }),
      catchError(error => {
        console.error('獲取候選人時間序列數據失敗:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 從時間序列統計中提取標籤
   */
  private extractLabelsFromTimeSeries(timeSeriesStats: any, days: number): string[] {
    const keyMap: { [key: number]: string } = {
      7: 'recent_7_days_cumulative',
      14: 'recent_14_days_cumulative',
      30: 'recent_30_days_cumulative',
      90: 'recent_90_days_cumulative',
      180: 'recent_180_days_cumulative',
      365: 'recent_365_days_cumulative'
    };

    const targetKey = keyMap[days] || 'recent_365_days_cumulative';
    const stats = timeSeriesStats[targetKey];
    
    if (!stats || !stats.stats_points) {
      return [];
    }

    return stats.stats_points.map((point: any) => {
      if (point.date) {
        try {
          const date = new Date(point.date);
          return date.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        } catch (e) {
          return point.date;
        }
      }
      return '';
    });
  }

  /**
   * 從時間序列統計中提取數據集
   */
  private extractDatasetsFromTimeSeries(timeSeriesStats: any, days: number, candidateName: string): any[] {
    const keyMap: { [key: number]: string } = {
      7: 'recent_7_days_cumulative',
      14: 'recent_14_days_cumulative',
      30: 'recent_30_days_cumulative',
      90: 'recent_90_days_cumulative',
      180: 'recent_180_days_cumulative',
      365: 'recent_365_days_cumulative'
    };

    const targetKey = keyMap[days] || 'recent_365_days_cumulative';
    const stats = timeSeriesStats[targetKey];
    
    if (!stats || !stats.stats_points) {
      return [];
    }

    // 提取正負面數據
    const positiveData = stats.stats_points.map((point: any) => {
      const sentiment = point.sentiment_counts || {};
      return sentiment.positive || 0;
    });

    const negativeData = stats.stats_points.map((point: any) => {
      const sentiment = point.sentiment_counts || {};
      return sentiment.negative || 0;
    });

    return [
      {
        label: `${candidateName} - 正面網友數`,
        data: positiveData,
        borderColor: '#28a745',
        backgroundColor: '#28a74520',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#28a745',
        pointBorderColor: '#28a745',
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: `${candidateName} - 負面網友數`,
        data: negativeData,
        borderColor: '#dc3545',
        backgroundColor: '#dc354520',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#dc3545',
        pointBorderColor: '#dc3545',
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ];
  }

}
