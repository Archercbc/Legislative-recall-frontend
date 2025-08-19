import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

// 移除未使用的 CoreUI 組件

@Component({
    selector: 'app-county-detail',
    imports: [
      CommonModule
    ],
    templateUrl: './county-detail.component.html',
    styleUrl: './county-detail.component.scss'
})
export class CountyDetailComponent implements OnInit {
  countyId = '';
  districts: string[] = [];
  selectedDistrict = '';
  allPoliticians: any[] = [];
  filteredPoliticians: any[] = [];
  politicians: any[] = []; // 保持向後兼容
  stats: { keyword: string, value: number }[] = [];
  loading = false;
  selectedStatus = 'all';

  // 罷免狀態定義（更新為三個主要狀態）
  recallStatuses = [
    { key: 'all', label: '全部狀態', icon: 'cilList' },
    { key: '罷免失敗', label: '罷免失敗', icon: 'cilBan' },
    { key: '罷免案不成立', label: '罷免案不成立', icon: 'cilXCircle' },
    { key: '民調封關中', label: '民調封關中', icon: 'cilWarning' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService
  ) {
    this.route.paramMap.subscribe(params => {
      this.countyId = params.get('countyId') || '';
      if (this.countyId) {
        this.loadCountyLegislators();
      }
    });
  }

  ngOnInit() {
    // 初始化邏輯
  }

  private loadCountyLegislators() {
    this.loading = true;

    // 簡化：只載入立委列表
    this.dataService.getLegislators(this.countyId).subscribe({
      next: (data) => {
        this.allPoliticians = data;
        this.filteredPoliticians = data;
        this.politicians = data; // 保持向後兼容
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  selectDistrict(d: string) {
    this.selectedDistrict = d;
  }

  goToPolitician(politician: any) {
    // 使用立委姓名導航到個人頁面
    this.router.navigate(['/politician', politician.name || politician.id]);
  }

  onImageError(event: any) {
    // 設置預設頭像
    event.target.src = 'assets/images/default-avatar.png';
  }

  // 罷免狀態篩選
  filterByStatus(status: string) {
    this.selectedStatus = status;

    if (status === 'all') {
      this.filteredPoliticians = [...this.allPoliticians];
    } else {
      this.filteredPoliticians = this.allPoliticians.filter(politician =>
        politician.recall_data?.罷免狀態 === status || 
        politician.status === status
      );
    }
  }

  // 獲取特定狀態的立委數量
  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.allPoliticians.length;
    }
    return this.allPoliticians.filter(politician =>
      politician.recall_data?.罷免狀態 === status || 
      politician.status === status
    ).length;
  }

  // 罷免狀態文字轉換
  getRecallStatusText(status: string): string {
    if (!status) return '未知狀態';

    const statusMap: { [key: string]: string } = {
      '罷免失敗': '罷免失敗',
      '罷免案不成立': '罷免案不成立',
      '民調封關中': '民調封關中'
    };
    return statusMap[status] || status || '未知狀態';
  }

  // 罷免狀態樣式類別
  getRecallStatusClass(status: string): string {
    const statusText = this.getRecallStatusText(status);
    const classMap: { [key: string]: string } = {
      '罷免失敗': 'status-recall-failed',
      '罷免案不成立': 'status-petition-failed',
      '民調封關中': 'status-recall-ongoing'
    };
    return classMap[statusText] || 'status-survey';
  }

  // 罷免狀態圖標
  getRecallStatusIcon(status: string): string {
    const statusText = this.getRecallStatusText(status);
    const iconMap: { [key: string]: string } = {
      '罷免失敗': 'cilBan',
      '罷免案不成立': 'cilXCircle',
      '民調封關中': 'cilWarning'
    };
    return iconMap[statusText] || 'cilChartLine';
  }

  // 狀態按鈕樣式
  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'all': 'btn-all',
      '罷免失敗': 'btn-recall-failed',
      '罷免案不成立': 'btn-petition-failed',
      '民調封關中': 'btn-recall-ongoing'
    };
    return classMap[status] || 'btn-all';
  }
}
