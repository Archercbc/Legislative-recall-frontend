import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DataService } from './services/data.service';
import { CommonModule } from '@angular/common';
import { WebAiAssistantComponent } from './pages/web-ai-assistant/web-ai-assistant.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, CommonModule, WebAiAssistantComponent],
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
  
  constructor(private router: Router, private dataService: DataService) {}
  
  ngOnInit() {
    // 立即記錄頁面訪問（包括刷新頁面）
    this.recordPageVisit('/');
    
    // 獲取訪問統計
    this.loadVisitorStats();
    
    // 監聽路由變化，每次訪問都記錄
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // 每次路由變化都記錄
      this.recordPageVisit(event.urlAfterRedirects || '/');
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
  
  // 記錄頁面訪問 (每次訪問都記錄)
  private recordPageVisit(page: string) {
    console.log('記錄頁面訪問:', page);
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
