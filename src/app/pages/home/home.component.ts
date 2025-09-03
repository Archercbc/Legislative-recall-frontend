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

  constructor(
    private visitorService: VisitorService,
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.loadVisitorStats();
    // 定期更新統計數據，確保與導航欄同步
    setInterval(() => {
      this.loadVisitorStats();
    }, 30000); // 每30秒更新一次
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

  // 獲取立委輿情分析數量
  getLegislatorCount(): number {
    return 31; // 固定值
  }
}
