import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';  // ✅ 匯入 CommonModule
import { HttpClientModule } from '@angular/common/http';
import { DataService } from '../../services/data.service';

@Component({
    selector: 'app-county-detail',
    imports: [CommonModule, HttpClientModule],
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

  // 罷免狀態定義
  recallStatuses = [
    { key: 'all', label: '全部狀態', icon: 'cil-list' },
    { key: '連署進行中', label: '連署進行中', icon: 'cil-clock' },
    { key: '連署未通過', label: '連署未通過', icon: 'cil-x-circle' },
    { key: '罷免進行中', label: '罷免進行中', icon: 'cil-warning' },
    { key: '罷免未通過', label: '罷免未通過', icon: 'cil-ban' },
    { key: '罷免成功', label: '罷免成功', icon: 'cil-check-circle' }
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
        this.getRecallStatusText(politician.recallStatus) === status
      );
    }
  }

  // 獲取特定狀態的立委數量
  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.allPoliticians.length;
    }
    return this.allPoliticians.filter(politician =>
      this.getRecallStatusText(politician.recallStatus) === status
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
      '網路聲量調查': 'cil-chart-line',
      '連署進行中': 'cil-clock',
      '連署未通過': 'cil-x-circle',
      '罷免進行中': 'cil-warning',
      '罷免未通過': 'cil-ban',
      '罷免成功': 'cil-check-circle',
      '一階進行中': 'cil-clock',
      '一階成功': 'cil-check',
      '一階失敗': 'cil-x-circle',
      '二階進行中': 'cil-warning'
    };
    return iconMap[statusText] || 'cil-chart-line';
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
