import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { navItems, navigationConfig } from '../_nav';
import { VisitorService, VisitorStats } from '../../../services/visitor.service';

@Component({
  selector: 'app-default-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './default-header.component.html',
  styleUrl: './default-header.component.scss'
})
export class DefaultHeaderComponent implements OnInit {
  visitorStats: VisitorStats | null = null;
  navItems = navItems;
  brand = navigationConfig.brand;
  showStats = navigationConfig.stats.showInHeader;

  constructor(private visitorService: VisitorService) { }

  ngOnInit(): void {
    this.loadVisitorStats();
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
}
