import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VisitorService, VisitorStats } from '../../services/visitor.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  visitorStats: VisitorStats | null = null;
  platformStats: any = null;
  isLoadingPlatformStats = false;

  constructor(
    private visitorService: VisitorService,
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.loadVisitorStats();
    this.loadPlatformStats();
  }

  private loadVisitorStats(): void {
    // 使用VisitorService獲取訪問統計
    this.visitorService.getVisitorStats()
      .then((stats) => {
        this.visitorStats = stats;
      })
      .catch((error) => {
        console.error('獲取訪問統計失敗:', error);
        // 如果API失敗，使用默認值
        this.visitorStats = {
          total_visits: 0,
          today_visitors: 0
        };
      });
  }

  private loadPlatformStats(): void {
    this.isLoadingPlatformStats = true;
    
    // 獲取平台統計數據
    this.dataService.getPlatformStats()
      .then((stats) => {
        this.platformStats = stats;
        console.log('平台統計數據載入成功:', stats);
      })
      .catch((error) => {
        console.error('獲取平台統計失敗:', error);
        // 使用默認值
        this.platformStats = {
          total_legislators: 31,
          total_users: 0,
          total_comments: 0,
          platform_distribution: {
            'PTT': 0,
            'Threads': 0,
            'YouTube': 0
          }
        };
      })
      .finally(() => {
        this.isLoadingPlatformStats = false;
      });
  }

  // 獲取立委輿情分析數量
  getLegislatorCount(): number {
    return this.platformStats?.total_legislators || 31;
  }

  // 獲取總用戶數
  getTotalUsers(): number {
    return this.platformStats?.total_users || 0;
  }

  // 獲取總留言數
  getTotalComments(): number {
    return this.platformStats?.total_comments || 0;
  }

  // 獲取平台分布
  getPlatformDistribution(): any {
    return this.platformStats?.platform_distribution || {};
  }
}
