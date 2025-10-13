import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import taiwan from '@svg-maps/taiwan';
import { DataService } from '../../../services/data.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// 移除未使用的 CoreUI 組件

// 定義立委數據的介面
interface Politician {
  id: string;
  name: string;
  party?: string;
  image_url?: string;
  constituency?: string;
  district?: string; // 新增 district 屬性
  recallStatus?: string; // 新增 recallStatus 屬性
  recallNote?: string; // 新增 recallNote 屬性（罷免備註）
  recallVoteDate?: string; // 新增 recallVoteDate 屬性（罷免投票日）
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
    imports: [
      CommonModule,
      HttpClientModule,
      FormsModule
    ],
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
  
  // 新增載入狀態
  isLoading: boolean = true;

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

    areaCounts: AreaCount[] = []; // 動態計算有被罷免立委的縣市
  filteredAreaCounts: AreaCount[] = []; // 篩選後的縣市列表
  areaTargets: AreaTargets[] = []; // 動態從後端計算
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
  selectedStatuses: string[] = []; // 改為多選陣列
  showStatusFilter: boolean = false; // 控制篩選器展開/收起

  recallPoliticians: any[] = [];
  allLegislators: any[] = [];
  displayPoliticians: any[] = []; // 新增：用於顯示在地圖上的立委（會被篩選）

  // 罷免狀態定義（更新為三個主要狀態）
  recallStatuses = [
    { key: '罷免失敗', label: '罷免失敗' },
    { key: '罷免案不成立', label: '罷免案不成立' },
    { key: '民調封關中', label: '民調封關中' }
  ];

  // 區域名稱對應地圖 id
  areaNameToCountyId: Record<string, string> = {
    '臺北市': 'taipei-city',
    '台北市': 'taipei-city',
    '新北市': 'new-taipei-city',
    '桃園市': 'taoyuan-city',
    '臺中市': 'taichung-city',
    '台中市': 'taichung-city',
    '臺南市': 'tainan-city',
    '台南市': 'tainan-city',
    '高雄市': 'kaohsiung-city',
    '基隆市': 'keelung-city',
    '新竹市': 'hsinchu-city',
    '新竹縣': 'hsinchu-county',
    '苗栗縣': 'miaoli-county',
    '彰化縣': 'changhua-county',
    '南投縣': 'nantou-county',
    '雲林縣': 'yunlin-county',
    '嘉義市': 'chiayi-city',
    '嘉義縣': 'chiayi-county',
    '屏東縣': 'pingtung-county',
    '宜蘭縣': 'yilan-county',
    '花蓮縣': 'hualien-county',
    '臺東縣': 'taitung-county',
    '台東縣': 'taitung-county',
    '澎湖縣': 'penghu-county',
    '金門縣': 'kinmen-county',
    '連江縣': 'lienchiang-county',
    // 原住民選區不對應地圖
  };

  showUsageModal: boolean = true; // 預設一進來就顯示

  // 讓 ViewChildren 可以查詢到 SVG 中的 path 元素
  @ViewChildren('countyPath') countyPaths!: QueryList<ElementRef<SVGPathElement>>;

  // 移除手動設定的座標，改為初始化一個空物件
  countyLabelPositions: Record<string, { x: number, y: number }> = {};

  constructor(private router: Router, private dataService: DataService) {}

  ngOnInit() {
    // 檢查 localStorage
    const usageSeen = localStorage.getItem('taiwanMapUsageSeen');
    this.showUsageModal = !usageSeen;

    // 開始載入，設定載入狀態
    this.isLoading = true;
    
    // 1. 載入所有立委主資料
    this.dataService.getLegislators().subscribe({
      next: legislators => {
        this.allLegislators = legislators;
        // 2. 從後端 recall API 取得資料
        this.dataService.getRecallList().subscribe({
          next: recallList => {
            console.log('recallList', recallList);
            this.recallPoliticians = recallList.map(r => {
              // 找到對應立委主資料
              const match = this.allLegislators.find(l => l.name === r["姓名"]);
              return {
                ...r,
                // 優先使用人名作為 ID，確保路由正常工作
                id: r["姓名"],
                image_url: match?.image_url || '',
                party: match?.party || '',
                constituency: match?.constituency || '',
                // 新增罷免備註和罷免投票日
                recallNote: r["罷免備註"] || r["第一次罷免日期"] || '',
                recallVoteDate: r.recall_data?.罷免投票日 || ''
              };
            });

            // 初始化顯示的立委列表
            this.initializeDisplayPoliticians();

            // 動態計算有被罷免立委的縣市
            this.calculateAreaCounts();
            
            // 所有資料載入完成，關閉載入狀態
            this.isLoading = false;
            // 延遲執行，確保 View 更新後再計算座標
            setTimeout(() => this.calculateAllCountyLabelPositions(), 0);
          },
          error: err => {
            this.recallPoliticians = [];
            this.displayPoliticians = []; // 同時清空顯示列表
            // 即使錯誤也要關閉載入狀態
            this.isLoading = false;
            // 延遲執行，確保 View 更新後再計算座標
            setTimeout(() => this.calculateAllCountyLabelPositions(), 0);
          }
        });
      },
      error: err => {
        this.allLegislators = [];
        this.displayPoliticians = []; // 同時清空顯示列表
        // 載入錯誤時也要關閉載入狀態
        this.isLoading = false;
        // 延遲執行，確保 View 更新後再計算座標
        setTimeout(() => this.calculateAllCountyLabelPositions(), 0);
      }
    });
  }

  calculateAllCountyLabelPositions() {
    // 確保 countyPaths 已經被初始化
    if (!this.countyPaths) {
      return;
    }
    
    this.countyPaths.forEach(pathRef => {
      const pathElement = pathRef.nativeElement;
      const countyId = pathElement.id;
      if (countyId) {
        try {
          const bbox = pathElement.getBBox();
          let centerX = bbox.x + bbox.width / 2;
          let centerY = bbox.y + bbox.height / 2;
          
          // 針對特定縣市進行手動微調，以修正BBox中心點的視覺偏差
          switch(countyId) {
            case 'new-taipei-city': // 新北市，BBox中心點在台北市內，需大幅調整
              centerX = bbox.x + bbox.width * 0.25; 
              centerY = bbox.y + bbox.height * 0.6;
              break;
            case 'taipei-city': // 台北市
              centerY += 5; // 稍微下移，避免與新北市重疊
              break;
            case 'keelung-city': // 基隆市
              centerY -= 8;
              centerX += 5;
              break;
            case 'changhua-county': // 彰化縣
              centerX -= 10;
              break;
            case 'nantou-county': // 南投縣，往右移，更靠近縣市視覺中心
              centerX += 15;
              break;
            case 'yunlin-county': // 雲林縣
              centerY -= 5;
              break;
            case 'chiayi-city': // 嘉義市，形狀小，需特別調整
              centerX -= 8;
              break;
            case 'chiayi-county': // 嘉義縣，環繞嘉義市
              centerY += 15;
              centerX -= 10;
              break;
            case 'hualien-county': // 花蓮縣，修正方向，需大幅右移
              centerX += 10; 
              centerY -= 20;
              break;
            case 'taitung-county': // 台東縣，修正方向，需大幅右移
              centerX -= 45;
              centerY -= 30;
              break;
            case 'penghu-county': // 澎湖縣
              centerX -= 20;
              break;
            case 'kaohsiung-city': // 高雄市，微調
              centerY -= 10;
              break;
            case 'tainan-city': // 台南市
              centerY -= 5;
              break;
          }

          this.countyLabelPositions[countyId] = { x: centerX, y: centerY };
        } catch (e) {
          // 如果 getBBox 在隱藏的元素上調用，可能會拋出錯誤
          console.error(`Could not get BBox for ${countyId}:`, e);
          // 提供一個預設值以避免崩潰
          this.countyLabelPositions[countyId] = { x: 0, y: 0 };
        }
      }
    });
  }

  initCountyPopulation() {
    for (const county in this.countyNames) {
      this.countyPopulation[county] = Math.floor(Math.random() * 100) + 1;
    }
  }

  // 初始化顯示的立委列表
  initializeDisplayPoliticians() {
    // 當沒有選擇任何狀態篩選時，顯示所有立委
    if (this.selectedStatuses.length === 0) {
      this.displayPoliticians = [...this.recallPoliticians];
      console.log('🔴 無狀態篩選：顯示全部立委，共', this.displayPoliticians.length, '位');
    } else {
      // 有狀態篩選時，顯示篩選後的立委
      this.displayPoliticians = this.recallPoliticians.filter(r =>
        this.selectedStatuses.includes(r.status || r.recall_data?.狀態)
      );
      console.log('🔴 有狀態篩選：顯示篩選後立委，共', this.displayPoliticians.length, '位');
    }
  }

  // 動態計算有被罷免立委的縣市
  calculateAreaCounts() {
    const areaCounts: { [key: string]: number } = {};

    // 當沒有狀態篩選時，統計所有立委；有狀態篩選時，統計篩選後的立委
    const politiciansToCount = this.selectedStatuses.length === 0 ? this.recallPoliticians : this.displayPoliticians;
    
    // 統計每個縣市的被罷免立委數量
    politiciansToCount.forEach(r => {
      const area = r["行政區"] || r.recall_data?.行政區;
      if (area) {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    });

    // 轉換為 AreaCount 陣列，只包含有被罷免立委的縣市
    this.areaCounts = Object.entries(areaCounts).map(([area, count]) => ({
      area,
      count
    })).sort((a, b) => b.count - a.count); // 按數量降序排列

    // 初始化篩選列表為全部縣市
    this.filteredAreaCounts = [...this.areaCounts];

    // 動態計算 areaTargets
    this.calculateAreaTargets();
  }

  // 動態計算每個縣市的被罷免立委名單
  calculateAreaTargets() {
    const areaTargetsMap: { [key: string]: string[] } = {};

    // 當沒有狀態篩選時，統計所有立委；有狀態篩選時，統計篩選後的立委
    const politiciansToCount = this.selectedStatuses.length === 0 ? this.recallPoliticians : this.displayPoliticians;

    politiciansToCount.forEach(r => {
      const area = r["行政區"] || r.recall_data?.行政區;
      const name = r["姓名"];
      if (area && name) {
        if (!areaTargetsMap[area]) {
          areaTargetsMap[area] = [];
        }
        areaTargetsMap[area].push(name);
      }
    });

    this.areaTargets = Object.entries(areaTargetsMap).map(([area, targets]) => ({
      area,
      targets
    }));
  }

  onCountyClick(id: string, name: string) {
    const countyName = this.getCountyName(id);

    if (this.filterRecallOnly) {
      // 顯示該縣市所有被罷免立委
      const recallList = this.recallPoliticians.filter(r => r["行政區"] === countyName);
      this.selectedCounty = id;
      this.selectedParty = null;
      this.politicians = recallList.map(r => ({
        id: r["姓名"], // 直接使用姓名作為 ID
        name: r["姓名"],
        image_url: r.image_url,
        constituency: r.constituency,
        party: r.party,
        recallNote: r.recallNote || '',
        recallVoteDate: r.recallVoteDate || ''
      }));
      return;
    }

    // 在右邊顯示該縣市的立委列表（不導航到其他頁面）
    this.selectedCounty = id;
    this.selectedParty = null;
    this.politicians = [];

    // 更新選中縣市的樣式
    this.updateCountyStyles(id);

    // 當沒有狀態篩選時，檢查所有立委；有狀態篩選時，檢查篩選後的立委
    const politiciansToCheck = this.selectedStatuses.length === 0 ? this.recallPoliticians : this.displayPoliticians;
    const recallListInCounty = politiciansToCheck.filter(r =>
      (r["行政區"] || r.recall_data?.行政區) === countyName
    );

    if (recallListInCounty.length > 0) {
      // 如果篩選後該縣市還有立委，則顯示他們
      this.politicians = recallListInCounty.map(r => ({
        id: r["姓名"],
        name: r["姓名"],
        image_url: r.image_url,
        constituency: r.constituency,
        party: r.party,
        recallStatus: this.getDisplayRecallStatus(r.status || r.recall_data?.狀態 || '網友總聲量調查', r["姓名"]),
        recallNote: r.recallNote || '',
        recallVoteDate: r.recallVoteDate || ''
      }));
    } else {
      // 該縣市在目前的篩選條件下沒有符合的立委，或者該縣市本來就沒有罷免案
      const hasAnyRecallInCounty = this.recallPoliticians.some(r =>
        (r["行政區"] || r.recall_data?.行政區) === countyName
      );

      if (hasAnyRecallInCounty) {
          // 本來有，但被篩選掉了
          this.politicians = [{
            id: 'no-recall-in-filter',
            name: '該縣市在此篩選條件下無符合之立委',
            image_url: '',
            constituency: '',
            party: '',
            recallStatus: ''
          }];
      } else {
          // 本來就沒有
          this.politicians = [{
            id: 'no-recall',
            name: '該縣市沒有被提案罷免之立委',
            image_url: '',
            constituency: '',
            party: '',
            recallStatus: ''
          }];
      }
    }
  }

  updateCountyStyles(_selectedId: string) {
    // 完全移除高亮功能，保持地圖簡潔
    // 不再更改任何縣市的顏色
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

  goToPolitician(id: string | undefined) {
    // 安全檢查：確保 id 存在且不為空
    if (!id || id.trim() === '') {
      console.error('Invalid politician ID:', id);
      return;
    }

    // 使用人名進行導航到立委詳細頁面
    this.router.navigate(['/legislator', id]);
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

  // 根據政黨返回對應的顏色
  getPartyColor(party: string | undefined): string {
    if (!party) return '#7f8c8d';

    if (party.includes('國民黨')) return '#0078d4';
    if (party.includes('進步黨')) return '#00a65a';
    if (party.includes('民眾黨')) return '#f5f5f5';

    return '#7f8c8d';
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

  // 獲取狀態對應的顏色
  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      '二階連署進行中': '#f39c12',
      '二階連署進行中 (已達門檻)': '#27ae60',
      '二階失敗': '#95a5a6',
      '三階投票進行中': '#e74c3c',
      '三階罷免成功': '#27ae60',
      '三階罷免失敗': '#7f8c8d',
      '罷免中止': '#95a5a6'
    };
    return colorMap[status] || '#3498db';
  }

  // 獲取特定狀態的立委數量
  getStatusCount(status: string): number {
    return this.recallPoliticians.filter(r =>
      (r.status || r.recall_data?.狀態) === status
    ).length;
  }

  // 罷免狀態圖標（簡化版）
  getRecallStatusIcon(_status: string): string {
    // 使用簡單的 SVG 圖標
    return 'status-icon';
  }

  // 罷免狀態樣式類別
  getRecallStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      '罷免失敗': 'status-recall-failed',
      '罷免案不成立': 'status-petition-failed',
      '民調封關中': 'status-recall-ongoing'
    };
    return classMap[status] || 'status-survey';
  }


  closeUsageModal() {
    this.showUsageModal = false;
    localStorage.setItem('taiwanMapUsageSeen', '1');
  }

  // 獲取指定縣市的被罷免立委數量
  getRecallCountByCountyId(countyId: string): number {
    const countyName = this.getCountyName(countyId);
    const count = this.displayPoliticians.filter(r => // 改為使用 displayPoliticians
      (r["行政區"] || r.recall_data?.行政區) === countyName
    ).length;
    return count;
  }

  // 檢查是否應該顯示數字（只有當數量大於0時才顯示）
  shouldShowRecallCount(countyId: string): boolean {
    return this.getRecallCountByCountyId(countyId) > 0;
  }

  // 獲取顯示用的罷免狀態文字（與legislators-detail組件保持一致）
  getDisplayRecallStatus(status: string, legislatorName?: string): string {
    // 只有特定的6個人會顯示民調封關中
    const blockedLegislators = ['馬文君', '游顥', '羅明才', '江啟臣', '楊瓊瓔', '顏寬恒', '林思銘'];
    
    // 檢查是否是指定的民調封關立委
    if (legislatorName && blockedLegislators.includes(legislatorName)) {
      // 將特定的罷免狀態改為"民調封關中"
      const statusList = ['二階連署進行中', '二階失敗', '三階投票進行中', '三階罷免成功', '三階罷免失敗', '二階補件中'];
      if (statusList.includes(status)) {
        return '民調封關中';
      }
    }
    
    // 其他人顯示原本狀態
    return status;
  }

  // 獲取縣市標籤位置
  getCountyLabelPosition(countyId: string): { x: number, y: number } {
    return this.countyLabelPositions[countyId] || { x: 0, y: 0 };
  }

  // 根據縣市名稱獲取地圖ID
  getCountyIdByName(countyName: string): string | null {
    for (const [id, name] of Object.entries(this.countyNames)) {
      if (name === countyName) {
        return id;
      }
    }
    return null;
  }

  // 根據區域名稱獲取地圖ID
  getCountyIdByAreaName(areaName: string): string | null {
    return this.areaNameToCountyId[areaName] || null;
  }

  onAreaListClick(areaName: string) {
    const countyId = this.getCountyIdByAreaName(areaName);
    if (countyId) {
      this.onCountyClick(countyId, areaName);
    }
  }

  // 展開/收起篩選器
  toggleStatusFilter() {
    this.showStatusFilter = !this.showStatusFilter;
  }

  // 狀態選擇變更
  onStatusChange(status: string, event: any) {
    if (event.target.checked) {
      if (!this.selectedStatuses.includes(status)) {
        this.selectedStatuses.push(status);
      }
    } else {
      this.selectedStatuses = this.selectedStatuses.filter(s => s !== status);
    }
  }

  // 套用篩選
  applyStatusFilters() {
    this.selectedCounty = null;
    this.selectedParty = null;
    this.politicians = [];

    if (this.selectedStatuses.length === 0) {
      // 沒有選擇任何狀態，顯示所有縣市
      this.displayPoliticians = [...this.recallPoliticians]; // 重置顯示列表
    } else {
      // 篩選選中狀態的立委，並更新縣市列表
      const filteredPoliticians = this.recallPoliticians.filter(r =>
        this.selectedStatuses.includes(r.status || r.recall_data?.狀態)
      );
      this.displayPoliticians = filteredPoliticians; // 更新顯示列表
    }

    // 重新計算縣市數量和目標列表
    this.calculateAreaCounts();

    // 不再更新地圖高亮，取消高亮功能
    this.resetMapHighlight();
  }

  // 重置地圖高亮
  resetMapHighlight() {
    document.querySelectorAll('.taiwan-svg path').forEach(path => {
      path.classList.remove('selected');
      path.setAttribute('fill', '#cccccc');
    });
  }

  // 清除所有篩選
  clearAllFilters() {
    this.selectedStatuses = [];
    this.displayPoliticians = [...this.recallPoliticians]; // 重置顯示列表
    // 重新計算縣市數量和目標列表
    this.calculateAreaCounts();
    this.resetMapHighlight();
  }
}