import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconModule } from '@coreui/icons-angular';
import { PoliticianService } from '../../../services/politician.service';

interface Politician {
  name: string;
  target_type: string;
  total_posts: number;
  platform_stats: { [key: string]: number };
  sentiment_stats: { [key: string]: number };
  wordcloud_data: Array<{ word: string; weight: number }>;
  last_updated: string;
  image_url?: string;
}

@Component({
  selector: 'app-politicians',
  standalone: true,
  imports: [CommonModule, FormsModule, IconModule],
  templateUrl: './politicians.component.html',
  styleUrl: './politicians.component.scss'
})
export class PoliticiansComponent implements OnInit {
  isLoading = false;
  searchTerm = '';
  selectedFilter = 'all';
  politicians: Politician[] = [];
  filteredPoliticians: Politician[] = [];

  constructor(
    private router: Router,
    private politicianService: PoliticianService
  ) {}

  ngOnInit(): void {
    this.loadPoliticians();
  }

  loadPoliticians(): void {
    this.isLoading = true;
    
    // 使用 Service 載入政治人物數據 - 參考 legislator 的實現
    this.politicianService.getPoliticians()
      .subscribe({
        next: (politicians) => {
          // 為每個政治人物添加target_type（如果沒有）
          this.politicians = politicians.map((p: any) => ({
            ...p,
            target_type: p.target_type || 'politician'
          }));
          
          this.filterPoliticians();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('載入政治人物數據失敗:', error);
          this.isLoading = false;
        }
      });
  }

  onSearchChange(): void {
    this.filterPoliticians();
  }

  setFilter(filter: string): void {
    this.selectedFilter = filter;
    this.filterPoliticians();
  }

  filterPoliticians(): void {
    let filtered = this.politicians;
    
    // 按類型篩選
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(p => p.target_type === this.selectedFilter);
    }
    
    // 按搜索詞篩選
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower)
      );
    }
    
    this.filteredPoliticians = filtered;
  }

  getTypeIcon(targetType: string): string {
    switch (targetType) {
      case 'legislator':
        return 'fas fa-landmark';
      case 'politician':
        return 'fas fa-user-tie';
      default:
        return 'fas fa-user';
    }
  }

  getTypeLabel(targetType: string): string {
    switch (targetType) {
      case 'legislator':
        return '立法委員';
      case 'politician':
        return '政治人物';
      default:
        return '未知類型';
    }
  }

  getTopPlatforms(platformStats: { [key: string]: number }): Array<{key: string, value: number}> {
    if (!platformStats) return [];
    
    return Object.entries(platformStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([key, value]) => ({ key, value }));
  }

  viewPoliticianDetail(name: string, targetType: string): void {
    // 根據類型導航到不同的詳細頁面
    if (targetType === 'legislator') {
      this.router.navigate(['/legislator', name]);
    } else {
      this.router.navigate(['/politician', name]);
    }
  }

  onImageError(event: any): void {
    // 當圖片載入失敗時，使用預設圖片
    event.target.src = '/assets/default-avatar.png';
  }
}
