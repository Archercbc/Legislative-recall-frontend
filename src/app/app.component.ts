import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DataService } from './services/data.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, CommonModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true
})
export class AppComponent implements OnInit {
  title = 'legislative-recall';
  visitorStats: any = {
    total_visits: 0,
    today_visitors: 0
  };
  private visitRecorded = false; // 標記是否已記錄當次訪問
  
  constructor(private router: Router, private dataService: DataService) {}
  
  ngOnInit() {
    // 獲取訪問統計
    this.loadVisitorStats();
    
    // 監聽路由變化，但只記錄首次訪問
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // 只在首次訪問時記錄
      if (!this.visitRecorded) {
        this.checkAndRecordVisit(event.urlAfterRedirects || '/');
      }
    });
  }
  
  // 載入訪問統計
  loadVisitorStats() {
    this.dataService.getVisitorStats().subscribe({
      next: (stats) => {
        if (stats && typeof stats === 'object') {
          // 確保數據格式正確，使用與後端回傳的字段名稱一致
          this.visitorStats = {
            total_visits: stats.total_visits || 0,
            today_visitors: stats.today_visitors || 0
          };
          console.log('載入訪問統計成功:', this.visitorStats);
        }
      },
      error: (error) => {
        console.error('載入訪問統計失敗', error);
        // 初始化訪問計數
        this.initVisitorStats();
      }
    });
  }
  
  // 初始化訪問計數
  initVisitorStats() {
    this.dataService.initVisitorStats().subscribe({
      next: (result) => {
        console.log('初始化訪問計數成功:', result);
        // 重新載入訪問統計
        this.loadVisitorStats();
      },
      error: (error) => {
        console.error('初始化訪問計數失敗', error);
      }
    });
  }
  
  // 檢查並記錄頁面訪問 (只記錄每天首次訪問)
  private checkAndRecordVisit(page: string) {
    // 檢查 localStorage 中的訪問記錄
    const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD
    const lastVisitDate = localStorage.getItem('lastVisitDate');
    
    // 如果今天沒有訪問過，才記錄訪問
    if (lastVisitDate !== today) {
      console.log('記錄今日首次訪問');
      localStorage.setItem('lastVisitDate', today);
      this.recordPageVisit(page);
      this.visitRecorded = true;
    } else {
      console.log('今日已記錄過訪問，不重複計數');
      this.visitRecorded = true;
    }
  }
  
  // 記錄頁面訪問
  recordPageVisit(page: string) {
    this.dataService.recordVisit(page).subscribe({
      next: (result) => {
        // 更新訪問計數，確保顯示正確
        if (result && typeof result === 'object') {
          // 更新訪問統計，使用與後端回傳的字段名稱一致
          this.visitorStats = {
            total_visits: result.total_visits || 0,
            today_visitors: result.today_visitors || 0
          };
          console.log('更新訪問統計:', this.visitorStats);
        }
      },
      error: (error) => {
        console.error('記錄訪問失敗', error);
      }
    });
  }
}
