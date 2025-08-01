import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VisitorStats {
  total_visits: number;
  today_visitors: number;
  status?: string;
  last_updated?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VisitorService {
  private hasRecordedVisit = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // 監聽路由變化，記錄頁面訪問
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.recordPageVisit(event.url);
    });
  }

  /**
   * 記錄頁面訪問
   */
  recordPageVisit(page: string): void {
    // 避免重複記錄同一次訪問
    if (this.hasRecordedVisit) {
      return;
    }

    this.http.post(`${environment.apiUrl}/api/visitor/record`, { page })
      .subscribe({
        next: (response) => {
          console.log('訪問記錄成功:', response);
          this.hasRecordedVisit = true;
        },
        error: (error) => {
          console.error('記錄訪問失敗:', error);
        }
      });
  }

  /**
   * 獲取訪問統計
   */
  getVisitorStats(): Promise<VisitorStats> {
    return new Promise((resolve, reject) => {
      this.http.get<VisitorStats>(`${environment.apiUrl}/api/visitor/stats`)
        .subscribe({
          next: (stats) => {
            resolve(stats);
          },
          error: (error) => {
            console.error('獲取訪問統計失敗:', error);
            reject(error);
          }
        });
    });
  }

  /**
   * 重置訪問記錄標誌（用於測試）
   */
  resetVisitRecord(): void {
    this.hasRecordedVisit = false;
  }
} 