import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VisitorService, VisitorStats } from '../../services/visitor.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  visitorStats: VisitorStats | null = null;

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
