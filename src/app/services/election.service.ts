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

}
