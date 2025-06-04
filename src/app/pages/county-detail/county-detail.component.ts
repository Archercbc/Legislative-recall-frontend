import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';  // ✅ 匯入 CommonModule
import { HttpClientModule } from '@angular/common/http';
import { DataService } from '../../services/data.service';
import { SpinnerComponent } from '@coreui/angular';

@Component({
    selector: 'app-county-detail',
    imports: [CommonModule, HttpClientModule, SpinnerComponent],
    templateUrl: './county-detail.component.html',
    styleUrl: './county-detail.component.scss'
})
export class CountyDetailComponent implements OnInit {
  countyId = '';
  districts: string[] = [];
  selectedDistrict = '';
  politicians: any[] = [];
  stats: { keyword: string, value: number }[] = [];
  loading = false;

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

    // 使用簡潔格式載入立委列表
    this.dataService.getLegislators(this.countyId).subscribe({
      next: (data) => {
        this.politicians = data;
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
}
