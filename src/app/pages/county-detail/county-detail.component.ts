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

  // 罷免狀態定義（使用 CoreUI 4.0 圖標）
  recallStatuses = [
    { key: 'all', label: '全部狀態', icon: 'cilList' },
    { key: '連署進行中', label: '連署進行中', icon: 'cilClock' },
    { key: '連署未通過', label: '連署未通過', icon: 'cilXCircle' },
    { key: '罷免進行中', label: '罷免進行中', icon: 'cilWarning' },
    { key: '罷免未通過', label: '罷免未通過', icon: 'cilBan' },
    { key: '罷免成功', label: '罷免成功', icon: 'cilCheckCircle' },
    { key: '三階投票進行中', label: '三階投票進行中', icon: 'cilWarning' },
    { key: '一階進行中', label: '一階進行中', icon: 'cilClock' },
    { key: '二階進行中', label: '二階進行中', icon: 'cilWarning' }
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
        this.getRecallStatusText(politician.recall_data?.狀態) === status
      );
    }
  }

  // 獲取特定狀態的立委數量
  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.allPoliticians.length;
    }
    return this.allPoliticians.filter(politician =>
      this.getRecallStatusText(politician.recall_data?.狀態) === status
    ).length;
  }

  // 罷免狀態文字轉換
  getRecallStatusText(status: string): string {
    if (!status) return '網路聲量調查';

    const statusMap: { [key: string]: string } = {
      '網路聲量調查': '網路聲量調查',
      '連署中': '連署進行中',
      '連署進行中': '連署進行中',
      '連署未通過': '連署未通過',
      '罷免投票中': '罷免進行中',
      '罷免進行中': '罷免進行中',
      '罷免未通過': '罷免未通過',
      '罷免成功': '罷免成功',
      '已罷免': '罷免成功',
      '一階進行中': '一階進行中',
      '一階成功': '一階成功',
      '一階失敗': '一階失敗',
      '二階進行中': '二階進行中'
    };
    return statusMap[status] || status || '網路聲量調查';
  }

  // 罷免狀態樣式類別
  getRecallStatusClass(status: string): string {
    const statusText = this.getRecallStatusText(status);
    const classMap: { [key: string]: string } = {
      '網路聲量調查': 'status-survey',
      '連署進行中': 'status-petition-ongoing',
      '連署未通過': 'status-petition-failed',
      '罷免進行中': 'status-recall-ongoing',
      '罷免未通過': 'status-recall-failed',
      '罷免成功': 'status-recall-success',
      '一階進行中': 'status-petition-ongoing',
      '一階成功': 'status-petition-success',
      '一階失敗': 'status-petition-failed',
      '二階進行中': 'status-recall-ongoing'
    };
    return classMap[statusText] || 'status-survey';
  }

  // 罷免狀態圖標
  getRecallStatusIcon(status: string): string {
    const statusText = this.getRecallStatusText(status);
    const iconMap: { [key: string]: string } = {
      '網路聲量調查': 'cilChartLine',
      '連署進行中': 'cilClock',
      '連署未通過': 'cilXCircle',
      '罷免進行中': 'cilWarning',
      '罷免未通過': 'cilBan',
      '罷免成功': 'cilCheckCircle',
      '三階投票進行中': 'cilWarning',
      '一階進行中': 'cilClock',
      '一階成功': 'cilCheck',
      '一階失敗': 'cilXCircle',
      '二階進行中': 'cilWarning'
    };
    return iconMap[statusText] || 'cilChartLine';
  }

  // 狀態按鈕樣式
  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'all': 'btn-all',
      '連署進行中': 'btn-petition-ongoing',
      '連署未通過': 'btn-petition-failed',
      '罷免進行中': 'btn-recall-ongoing',
      '罷免未通過': 'btn-recall-failed',
      '罷免成功': 'btn-recall-success'
    };
    return classMap[status] || 'btn-all';
  }
}
