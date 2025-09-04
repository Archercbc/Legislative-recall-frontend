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
  private cachedStats: VisitorStats | null = null;
  private lastUpdateTime: number = 0;
  private readonly CACHE_DURATION = 10000; // 10秒緩存

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
   * 獲取訪問統計（帶緩存）
   */
  getVisitorStats(): Promise<VisitorStats> {
    const now = Date.now();
    
    // 如果緩存有效，直接返回緩存數據
    if (this.cachedStats && (now - this.lastUpdateTime) < this.CACHE_DURATION) {
      return Promise.resolve(this.cachedStats);
    }
    
    // 否則發送新的請求
    return new Promise((resolve, reject) => {
      this.http.get<VisitorStats>(`${environment.apiUrl}/api/visitor/stats`)
        .subscribe({
          next: (stats) => {
            // 更新緩存
            this.cachedStats = stats;
            this.lastUpdateTime = now;
            resolve(stats);
          },
          error: (error) => {
            console.error('獲取訪問統計失敗:', error);
            // 如果有緩存數據，返回緩存數據而不是錯誤
            if (this.cachedStats) {
              resolve(this.cachedStats);
            } else {
              reject(error);
            }
          }
        });
    });
  }

  /**
   * 強制刷新統計數據
   */
  refreshStats(): Promise<VisitorStats> {
    this.cachedStats = null;
    this.lastUpdateTime = 0;
    return this.getVisitorStats();
  }

  /**
   * 重置訪問記錄標誌（用於測試）
   */
  resetVisitRecord(): void {
    this.hasRecordedVisit = false;
  }
} 