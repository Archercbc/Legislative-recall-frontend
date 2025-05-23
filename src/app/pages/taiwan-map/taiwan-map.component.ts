import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import taiwan from '@svg-maps/taiwan';
import { DataService } from '../../services/data.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// 定義立委數據的介面
interface Politician {
  id: string;
  name: string;
  party?: string;
  image_url?: string;
  constituency?: string;
}
export interface AreaCount {
  area: string;
  count: number;
}
export interface AreaTargets {
  area: string;
  targets: string[];
}
@Component({
    selector: 'app-taiwan-map',
    imports: [CommonModule, HttpClientModule, FormsModule],
    templateUrl: './taiwan-map.component.html',
    styleUrls: ['./taiwan-map.component.scss']
})

export class TaiwanMapComponent implements OnInit {
  selectedCounty: string | null = null;
  selectedParty: string | null = null;
  politicians: Politician[] = [];
  stats: { keyword: string, value: number }[] = [];
  taiwanMap = taiwan;
  viewBox: string = "250 250 1000 1050";
  countyPopulation: Record<string, number> = {};
  
  countyNames: Record<string, string> = {
    'taipei-city': '臺北市',
    'new-taipei-city': '新北市',
    'taoyuan-city': '桃園市',
    'taichung-city': '臺中市',
    'tainan-city': '臺南市',
    'kaohsiung-city': '高雄市',
    'keelung-city': '基隆市',
    'hsinchu-city': '新竹市',
    'hsinchu-county': '新竹縣',
    'miaoli-county': '苗栗縣',
    'changhua-county': '彰化縣',
    'nantou-county': '南投縣',
    'yunlin-county': '雲林縣',
    'chiayi-city': '嘉義市',
    'chiayi-county': '嘉義縣',
    'pingtung-county': '屏東縣',
    'yilan-county': '宜蘭縣',
    'hualien-county': '花蓮縣',
    'taitung-county': '臺東縣',
    'penghu-county': '澎湖縣',
    'kinmen-county': '金門縣',
    'lienchiang-county': '連江縣',
  };

    areaCounts: AreaCount[] = [
    { area: '台北市', count: 6 },
    { area: '新北市', count: 6 },
    { area: '桃園市', count: 6 },
    { area: '新竹縣市', count: 3 },
    { area: '苗栗縣', count: 2 },
    { area: '台中市', count: 6 },
    { area: '南投縣', count: 2 },
    { area: '雲林縣', count: 1 },
    { area: '嘉義縣', count: 1 },
    { area: '台南市', count: 2 },
    { area: '高雄市', count: 2 },
    { area: '宜蘭縣', count: 1 },
    { area: '台東縣', count: 1 },
    { area: '花蓮縣', count: 1 }
   // { area: '原住民選區', count: 2 },
  ];

  areaTargets: AreaTargets[] = [
    { area: '台北市', targets: ['王鴻薇', '李彥秀', '羅智強', '徐巧芯', '賴士葆', '吳思瑤', '吳沛憶'] },
    { area: '新北市', targets: ['葉元之', '張智倫', '林德福', '羅明才', '廖先翔', '李坤城', '蘇巧慧', '張宏陸', '吳琪銘'] },
    { area: '桃園市', targets: ['牛煦庭', '涂權吉', '魯明哲', '萬美玲', '呂玉玲', '邱若華'] },
    { area: '新竹縣市', targets: ['鄭正鈐', '徐欣瑩', '林思銘'] },
    { area: '苗栗縣', targets: ['邱鎮軍', '陳超明'] },
    { area: '台中市', targets: ['顏寬恒', '楊瓊瓔', '廖偉翔', '黃健豪', '羅廷瑋', '江啟臣', '蔡其昌', '何欣純'] },
    { area: '南投縣', targets: ['馬文君', '游顥'] },
    { area: '雲林縣', targets: ['丁學忠'] },
    { area: '嘉義縣', targets: ['陳冠廷'] },
    { area: '台南市', targets: ['林俊憲', '王定宇'] },
    { area: '高雄市', targets: ['黃捷', '許智傑'] },
    { area: '宜蘭縣', targets: ['陳俊宇'] },
    { area: '台東縣', targets: ['黃建賓'] },
    { area: '花蓮縣', targets: ['傅崐萁'] },
    { area: '原住民選區', targets: ['陳瑩', '伍麗華'] },
  ];
  colorMap: Record<string, string> = {
    'taipei-city': '#f39c12',
    'new-taipei-city': '#16a085',
    'taoyuan-city': '#8e44ad',
    'taichung-city': '#27ae60',
    'tainan-city': '#e74c3c',
    'kaohsiung-city': '#2980b9',
    'keelung-city': '#1abc9c',
    'hsinchu-city': '#d35400',
    'hsinchu-county': '#c0392b',
    'miaoli-county': '#f1c40f',
    'changhua-county': '#2ecc71',
    'nantou-county': '#e67e22',
    'yunlin-county': '#34495e',
    'chiayi-city': '#9b59b6',
    'chiayi-county': '#2c3e50',
    'pingtung-county': '#3498db',
    'yilan-county': '#7f8c8d',
    'hualien-county': '#d35400',
    'taitung-county': '#e84393',
    'penghu-county': '#00b894',
    'kinmen-county': '#fdcb6e',
    'lienchiang-county': '#636e72',
  };

  filterRecallOnly: boolean = false;

  recallPoliticians: any[] = [];
  allLegislators: any[] = [];

  // 區域名稱對應地圖 id
  areaNameToCountyId: Record<string, string> = {
    '台北市': 'taipei-city',
    '新北市': 'new-taipei-city',
    '桃園市': 'taoyuan-city',
    '新竹縣市': 'hsinchu-county', // 只對應新竹縣，如需同時高亮縣市可擴充
    '苗栗縣': 'miaoli-county',
    '台中市': 'taichung-city',
    '南投縣': 'nantou-county',
    '雲林縣': 'yunlin-county',
    '嘉義縣': 'chiayi-county',
    '台南市': 'tainan-city',
    '高雄市': 'kaohsiung-city',
    '宜蘭縣': 'yilan-county',
    '台東縣': 'taitung-county',
    '花蓮縣': 'hualien-county',
    // 原住民選區不對應地圖
  };

  constructor(private router: Router, private dataService: DataService, private http: HttpClient) {
    this.initCountyPopulation();
  }

  

  ngOnInit() {
    // 1. 載入所有立委主資料
    this.dataService.getLegislators().subscribe({
      next: legislators => {
        this.allLegislators = legislators;
        // 2. 從後端 recall API 取得資料
        this.dataService.getRecallList().subscribe({
          next: recallList => {
            this.recallPoliticians = recallList.map(r => {
              // 找到對應立委主資料
              const match = this.allLegislators.find(l => l.name === r["姓名"]);
              return {
                ...r,
                id: match?.id || r["姓名"],
                image_url: match?.image_url || '',
                party: match?.party || '',
                constituency: match?.constituency || ''
              };
            });
          },
          error: err => {
            this.recallPoliticians = [];
          }
        });
      },
      error: err => {
        this.allLegislators = [];
      }
    });
  }

  initCountyPopulation() {
    for (const county in this.countyNames) {
      this.countyPopulation[county] = Math.floor(Math.random() * 100) + 1;
    }
  }

  onCountyClick(id: string, name: string) {
    if (this.filterRecallOnly) {
      // 顯示該縣市所有被罷免立委
      const countyName = this.getCountyName(id);
      const recallList = this.recallPoliticians.filter(r => r["行政區"] === countyName);
      this.selectedCounty = id;
      this.selectedParty = null;
      this.politicians = recallList.map(r => ({
        id: r.id,
        name: r["姓名"],
        image_url: r.image_url,
        constituency: r.constituency,
        party: r.party
      }));
      return;
    }
    this.selectedCounty = id;
    this.selectedParty = null;
    this.politicians = [];
    
    // 更新選中縣市的樣式
    this.updateCountyStyles(id);
    
    // 獲取立委資料
    const countyName = this.getCountyName(id);
    this.dataService.getLegislators(countyName).subscribe(data => {
      this.politicians = data;
    });
  }

  updateCountyStyles(selectedId: string) {
    // 移除所有選中樣式
    document.querySelectorAll('.taiwan-svg path').forEach(path => {
      path.classList.remove('selected');
      path.setAttribute('fill', '#cccccc');
    });
    
    // 為選中縣市添加樣式
    const selectedPath = document.getElementById(selectedId);
    if (selectedPath) {
      selectedPath.classList.add('selected');
      selectedPath.setAttribute('fill', this.colorMap[selectedId] || '#222222');
    }
  }

  onPartyClick(party: string) {
    this.selectedCounty = null;
    this.selectedParty = party;
    this.politicians = [];
    this.stats = [];
    this.dataService.getLegislators(undefined, party).subscribe(data => {
      this.politicians = data;
    });
  }

  resetFocus() {
    this.selectedCounty = null;
    this.selectedParty = null;
    this.politicians = [];
    this.stats = [];
    
    // 重置所有縣市樣式
    document.querySelectorAll('.taiwan-svg path').forEach(path => {
      path.classList.remove('selected');
      path.setAttribute('fill', '#cccccc');
    });
  }

  goToPolitician(id: string) {
    this.router.navigate(['/politician', id]);
  }

  getCountyName(id: string): string {
    return this.countyNames[id] || id;
  }

  getCountyColor(id: string): string {
    if (this.filterRecallOnly) {
      const countyName = this.getCountyName(id);
      const hasRecall = this.recallPoliticians.some(r => r["行政區"] === countyName);
      if (hasRecall) return '#e74c3c';
      return '#cccccc';
    }
    if (this.selectedCounty === id) {
      return this.colorMap[id] || '#222222';
    }
    return '#cccccc';
  }

  getCountyPopulation(id: string): number {
    return this.countyPopulation[id] || 0;
  }

  hoveredCounty: string | null = null;

  countyHover(id: string, isHovering: boolean) {
    this.hoveredCounty = isHovering ? id : null;
    
    const path = document.getElementById(id);
    if (path && id !== this.selectedCounty) {
      if (isHovering) {
        path.setAttribute('fill', '#666666');
        path.style.opacity = '1';
        path.style.transition = 'fill 0.3s';
      } else {
        path.setAttribute('fill', '#cccccc');
        path.style.opacity = '1';
      }
    }
  }

  // 根據政黨返回對應的顏色類
  getPartyColorClass(party: string | undefined): string {
    if (!party) return '';
    
    if (party.includes('國民黨')) return 'party-kmt';
    if (party.includes('進步黨')) return 'party-dpp';
    if (party.includes('民眾黨')) return 'party-tpp';
    
    return '';
  }

  onFilterChange() {
    if (this.filterRecallOnly) {
      this.selectedCounty = null;
      this.selectedParty = null;
      this.politicians = [];
    } else {
      this.resetFocus();
    }
  }

  getCountyIdByAreaName(areaName: string): string | null {
    return this.areaNameToCountyId[areaName] || null;
  }

  onAreaListClick(areaName: string) {
    const countyId = this.getCountyIdByAreaName(areaName);
    if (countyId) {
      this.onCountyClick(countyId, areaName);
    }
  }
}