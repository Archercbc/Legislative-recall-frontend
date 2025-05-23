import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';  // ✅ 匯入 CommonModule
import { HttpClientModule } from '@angular/common/http';

@Component({
    selector: 'app-county-detail',
    imports: [CommonModule, HttpClientModule],
    templateUrl: './county-detail.component.html',
    styleUrl: './county-detail.component.scss'
})
export class CountyDetailComponent {
  countyId = '';
  districts: string[] = [];
  selectedDistrict = '';
  politicians: { name: string, id: string }[] = [];
  stats: { keyword: string, value: number }[] = [];

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.paramMap.subscribe(params => {
      this.countyId = params.get('countyId') || '';
     
    });
  }

  selectDistrict(d: string) {
    this.selectedDistrict = d;
  }

  goToPolitician(id: string) {
    this.router.navigate(['/politician', id]);
  }
}
