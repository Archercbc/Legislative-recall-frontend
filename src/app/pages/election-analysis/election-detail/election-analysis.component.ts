import { Component, OnInit, ViewChild, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import { IconModule } from '@coreui/icons-angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ElectionService } from '../../../services/election.service';
import { election_config_list, getElectionById } from '../election-config';
import taiwan from '@svg-maps/taiwan';

// 自定義數據集類型
interface CustomChartDataset {
  label: string;
  data: number[];
  candidateId?: string;
  positiveData?: number[];
  negativeData?: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  fill: boolean;
  pointBackgroundColor: string;
  pointBorderColor: string;
  pointRadius: number;
  pointHoverRadius: number;
}

/**
 * ============================================================
 * 合併說明
 * ------------------------------------------------------------
 * 本元件同時支援兩種選舉，由 isLocalElection 判斷走哪一套：
 *   ▸ 地方選舉 (2026 縣市長) → 「三層地圖戰情室」邏輯（原本你的程式）
 *   ▸ 其他選舉 (如國民黨黨主席) → 「學長」的邏輯（累計 recent_xxx_days_cumulative）
 * 兩套邏輯各自放在 xxxLocal / xxxChairman 的方法內，互不呼叫。
 * ============================================================
 */
@Component({
  selector: 'app-election-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgChartsModule,
    ChartjsComponent,
    IconModule
  ],
  templateUrl: './election-analysis.component.html',
  styleUrl: './election-analysis.component.scss'
})
export class ElectionAnalysisComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('lineChart') lineChartComponent!: ChartjsComponent;
  @ViewChild('barChart') barChartComponent!: ChartjsComponent;

  @HostListener('window:resize')
  onResize() {
    if (this.lineChartComponent?.chart) {
      this.lineChartComponent.chart.resize();
    }
    if (this.barChartComponent?.chart) {
      this.barChartComponent.chart.resize();
    }
  }

  // ==========================================
  // 🟢 模式判斷：地方/縣市長選舉 vs 其他（黨主席等）
  // ==========================================
  get isLocalElection(): boolean {
    return this.electionId ? (this.electionId.includes('local') || this.electionId.includes('2026')) : false;
  }

  // ==========================================
  // 【地方選舉專用】視圖狀態與地圖
  // ==========================================
  // 視圖狀態：'map' (第一層) | 'city' (第二層) | 'candidate' (第三層)
  currentView: 'map' | 'city' | 'candidate' = 'map';
  selectedCounty: string | null = null;
  selectedCountyName: string = '';
  selectedCandidate: any = null; // 第三層選中的候選人

  viewBox: string = "-30 0 850 800";

  // 平台清單與代表色（用於候選人×平台長條圖）
  readonly platforms = ['fb', 'threads', 'youtube', 'ptt'];
  platformColors: { [key: string]: string } = {
    fb: '#1877F2',
    threads: '#6b7280',
    youtube: '#FF0000',
    ptt: '#f59e0b'
  };

  // 台灣主要縣市清單（對齊 SVG 地圖 ID）
  countyList = [
    { id: 'taipei-city', name: '臺北市', candidateCount: 0, hotIndex: '95%' },
    { id: 'new-taipei-city', name: '新北市', candidateCount: 0, hotIndex: '93%' },
    { id: 'keelung-city', name: '基隆市', candidateCount: 0, hotIndex: '82%' },
    { id: 'taoyuan-city', name: '桃園市', candidateCount: 0, hotIndex: '86%' },
    { id: 'hsinchu-county', name: '新竹縣', candidateCount: 0, hotIndex: '79%' },
    { id: 'hsinchu-city', name: '新竹市', candidateCount: 0, hotIndex: '91%' },
    { id: 'miaoli-county', name: '苗栗縣', candidateCount: 0, hotIndex: '74%' },
    { id: 'taichung-city', name: '臺中市', candidateCount: 0, hotIndex: '89%' },
    { id: 'changhua-county', name: '彰化縣', candidateCount: 0, hotIndex: '80%' },
    { id: 'nantou-county', name: '南投縣', candidateCount: 0, hotIndex: '72%' },
    { id: 'yunlin-county', name: '雲林縣', candidateCount: 0, hotIndex: '76%' },
    { id: 'chiayi-county', name: '嘉義縣', candidateCount: 0, hotIndex: '68%' },
    { id: 'chiayi-city', name: '嘉義市', candidateCount: 0, hotIndex: '78%' },
    { id: 'tainan-city', name: '臺南市', candidateCount: 0, hotIndex: '87%' },
    { id: 'kaohsiung-city', name: '高雄市', candidateCount: 0, hotIndex: '94%' },
    { id: 'pingtung-county', name: '屏東縣', candidateCount: 0, hotIndex: '75%' },
    { id: 'yilan-county', name: '宜蘭縣', candidateCount: 0, hotIndex: '77%' },
    { id: 'hualien-county', name: '花蓮縣', candidateCount: 0, hotIndex: '84%' },
    { id: 'taitung-county', name: '臺東縣', candidateCount: 0, hotIndex: '73%' },
    { id: 'penghu-county', name: '澎湖縣', candidateCount: 0, hotIndex: '70%' },
    { id: 'kinmen-county', name: '金門縣', candidateCount: 0, hotIndex: '66%' },
    { id: 'lienchiang-county', name: '連江縣', candidateCount: 0, hotIndex: '55%' },
  ];

  // 1. 本地候選人靜態設定檔 (保留照片、縣市、政黨，聲量預設為 0 等待 API 覆蓋)
  allMayoralCandidates: any[] = [
    // 台北市
    { id: 'chiang-wan-an', name: '蔣萬安', party: '國民黨', city: 'taipei-city', photo: '/assets/2026縣市長/蔣萬安.jpg', color: '#000080', status: 'incumbent', positive: 0, negative: 0, visible: true },
    { id: 'pua-shen-po', name: '沈伯洋', party: '民進黨', city: 'taipei-city', photo: '/assets/2026縣市長/沈伯洋.jpg', color: '#1b9431', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'kuo-hsi', name: '郭璽', party: '台灣麻將最大黨', city: 'taipei-city', photo: '/assets/2026縣市長/郭璽.jpg', color: '#ea580c', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'hsiao-wen-chien', name: '蕭文乾', party: '台灣SoR無法黨', city: 'taipei-city', photo: '/assets/2026縣市長/蕭文乾.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 新北市
    { id: 'lee-sichuan', name: '李四川', party: '國民黨', city: 'new-taipei-city', photo: '/assets/2026縣市長/李四川.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'su-chiao-hui', name: '蘇巧慧', party: '民進黨', city: 'new-taipei-city', photo: '/assets/2026縣市長/蘇巧慧.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    // 基隆市
    { id: 'tong-zi-wei', name: '童子瑋', party: '民進黨', city: 'keelung-city', photo: '/assets/2026縣市長/童子瑋.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'hsieh-kuo-liang', name: '謝國樑', party: '國民黨', city: 'keelung-city', photo: '/assets/2026縣市長/謝國樑.jpg', color: '#000080', status: 'incumbent', positive: 0, negative: 0, visible: true },
    // 桃園市
    { id: 'huang-shi-jie', name: '黃世杰', party: '民進黨', city: 'taoyuan-city', photo: '/assets/2026縣市長/黃世杰.jpg', color: '#1b9431', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chang-shan-cheng', name: '張善政', party: '國民黨', city: 'taoyuan-city', photo: '/assets/2026縣市長/張善政.jpg', color: '#000080', status: 'incumbent', positive: 0, negative: 0, visible: true },
    // 新竹縣
    { id: 'zheng-chao-fang', name: '鄭朝方', party: '民進黨', city: 'hsinchu-county', photo: '/assets/2026縣市長/鄭朝方.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'hsu-hsin-ying', name: '徐欣瑩', party: '國民黨', city: 'hsinchu-county', photo: '/assets/2026縣市長/徐欣瑩.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chu-ting-yu', name: '朱定瑀', party: '無黨籍', city: 'hsinchu-county', photo: '/assets/2026縣市長/朱定瑀.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 新竹市
    { id: 'zhuang-jing-cheng', name: '莊競程', party: '民進黨', city: 'hsinchu-city', photo: '/assets/2026縣市長/莊競程.jpg', color: '#1b9431', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'kao-hung-an', name: '高虹安', party: '無黨籍', city: 'hsinchu-city', photo: '/assets/2026縣市長/高虹安.jpg', color: '#fcfefe', status: 'incumbent', positive: 0, negative: 0, visible: true },
    { id: 'ho-chih-yung', name: '何志勇', party: '國民黨', city: 'hsinchu-city', photo: '/assets/2026縣市長/何志勇.jpg', color: '#000080', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'lee-chen-hsiu', name: '李貞秀', party: '無黨籍', city: 'hsinchu-city', photo: '/assets/2026縣市長/李貞秀.jpg', color: '#fcfefe', status: 'announced', positive: 0, negative: 0, visible: true },
    // 苗栗縣
    { id: 'chen-pin-an', name: '陳品安', party: '民進黨', city: 'miaoli-county', photo: '/assets/2026縣市長/陳品安.jpg', color: '#1b9431', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chung-tung-chin', name: '鍾東錦', party: '國民黨', city: 'miaoli-county', photo: '/assets/2026縣市長/鍾東錦.jpg', color: '#000080', status: 'incumbent', positive: 0, negative: 0, visible: true },
    // 台中市
    { id: 'ho-hsin-chun', name: '何欣純', party: '民進黨', city: 'taichung-city', photo: '/assets/2026縣市長/何欣純.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chiang-chi-chen', name: '江啟臣', party: '國民黨', city: 'taichung-city', photo: '/assets/2026縣市長/江啟臣.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'hung-li-hua', name: '洪麗華', party: '司法改革黨', city: 'taichung-city', photo: '/assets/2026縣市長/洪麗華.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 彰化縣
    { id: 'chen-su-yueh', name: '陳素月', party: '民進黨', city: 'changhua-county', photo: '/assets/2026縣市長/陳素月.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'wei-ping-cheng', name: '魏平政', party: '國民黨', city: 'changhua-county', photo: '/assets/2026縣市長/魏平政.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chiu-chien-fu', name: '邱建富', party: '無黨籍', city: 'changhua-county', photo: '/assets/2026縣市長/邱建富.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chen-chung-chia', name: '陳重嘉', party: '無黨籍', city: 'changhua-county', photo: '/assets/2026縣市長/陳重嘉.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 南投縣
    { id: 'wen-shih-cheng', name: '温世政', party: '民進黨', city: 'nantou-county', photo: '/assets/2026縣市長/温世政.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'hsu-shu-hua', name: '許淑華', party: '國民黨', city: 'nantou-county', photo: '/assets/2026縣市長/許淑華.jpg', color: '#000080', status: 'incumbent', positive: 0, negative: 0, visible: true },
    // 雲林縣
    { id: 'liu-chien-kuo', name: '劉建國', party: '民進黨', city: 'yunlin-county', photo: '/assets/2026縣市長/劉建國.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chang-chia-chun', name: '張嘉郡', party: '國民黨', city: 'yunlin-county', photo: '/assets/2026縣市長/張嘉郡.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'wu-ping-hui', name: '吳炳輝', party: '無黨籍', city: 'yunlin-county', photo: '/assets/2026縣市長/吳炳輝.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 嘉義縣
    { id: 'tsai-yi-yu', name: '蔡易餘', party: '民進黨', city: 'chiayi-county', photo: '/assets/2026縣市長/蔡易餘.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'wu-pin-jui', name: '吳品叡', party: '無黨籍', city: 'chiayi-county', photo: '/assets/2026縣市長/吳品叡.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    // 嘉義市
    { id: 'wang-mei-hui', name: '王美惠', party: '民進黨', city: 'chiayi-city', photo: '/assets/2026縣市長/王美惠.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chang-chi-kai', name: '張啓楷', party: '民眾黨', city: 'chiayi-city', photo: '/assets/2026縣市長/張啓楷.jpg', color: '#28c8c8', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'huang-hong-cheng', name: '黃宏成台灣阿成世界偉人財神總統', party: '無黨籍', city: 'chiayi-city', photo: '/assets/2026縣市長/黃宏成台灣阿成世界偉人財神總統.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chen-kai-huang', name: '陳愷璜', party: '無黨籍', city: 'chiayi-city', photo: '/assets/2026縣市長/陳愷璜.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 台南市
    { id: 'chen-ting-fei', name: '陳亭妃', party: '民進黨', city: 'tainan-city', photo: '/assets/2026縣市長/陳亭妃.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'hsieh-lung-chieh', name: '謝龍介', party: '國民黨', city: 'tainan-city', photo: '/assets/2026縣市長/謝龍介.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'yeh-jen-wen', name: '葉人文', party: '無黨籍', city: 'tainan-city', photo: '/assets/2026縣市長/葉人文.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'hsiao-lin-hung', name: '蕭燐洪', party: '台灣SoR無法黨', city: 'tainan-city', photo: '/assets/2026縣市長/蕭燐洪.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 高雄市
    { id: 'lai-jui-lung', name: '賴瑞隆', party: '民進黨', city: 'kaohsiung-city', photo: '/assets/2026縣市長/賴瑞隆.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'ko-chih-en', name: '柯志恩', party: '國民黨', city: 'kaohsiung-city', photo: '/assets/2026縣市長/柯志恩.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chang-ching', name: '張靜', party: '司法改革黨', city: 'kaohsiung-city', photo: '/assets/2026縣市長/張靜.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'wang-chao-min', name: '王肇民', party: '無黨籍', city: 'kaohsiung-city', photo: '/assets/2026縣市長/王肇民.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 屏東縣
    { id: 'chou-chun-mi', name: '周春米', party: '民進黨', city: 'pingtung-county', photo: '/assets/2026縣市長/周春米.jpg', color: '#1b9431', status: 'incumbent', positive: 0, negative: 0, visible: true },
    { id: 'su-ching-chuan', name: '蘇清泉', party: '國民黨', city: 'pingtung-county', photo: '/assets/2026縣市長/蘇清泉.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    // 宜蘭縣
    { id: 'lin-kuo-chang', name: '林國漳', party: '民進黨', city: 'yilan-county', photo: '/assets/2026縣市長/林國漳.jpg', color: '#1b9431', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'wu-tsung-hsien', name: '吳宗憲', party: '國民黨', city: 'yilan-county', photo: '/assets/2026縣市長/吳宗憲.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chen-wan-hui', name: '陳琬惠', party: '民眾黨', city: 'yilan-county', photo: '/assets/2026縣市長/陳琬惠.jpg', color: '#28c8c8', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chen-hung-yi', name: '陳宏毅', party: '無黨籍', city: 'yilan-county', photo: '/assets/2026縣市長/陳宏毅.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'liu-tsan-hui', name: '劉燦輝', party: '無黨籍', city: 'yilan-county', photo: '/assets/2026縣市長/劉燦輝.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 花蓮縣
    { id: 'yu-shu-chen', name: '游淑貞', party: '國民黨', city: 'hualien-county', photo: '/assets/2026縣市長/游淑貞.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chang-chun', name: '張峻', party: '無黨籍', city: 'hualien-county', photo: '/assets/2026縣市長/張峻.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'wei-chia-hsien', name: '魏嘉賢', party: '無黨籍', city: 'hualien-county', photo: '/assets/2026縣市長/魏嘉賢.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'lo-pei-chin', name: '羅佩秦', party: '無黨籍', city: 'hualien-county', photo: '/assets/2026縣市長/羅佩秦.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    // 台東縣
    { id: 'chen-ying', name: '陳瑩', party: '民進黨', city: 'taitung-county', photo: '/assets/2026縣市長/陳瑩.jpg', color: '#1b9431', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'wu-hsiu-hua', name: '吳秀華', party: '國民黨', city: 'taitung-county', photo: '/assets/2026縣市長/吳秀華.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'liu-chao-hao', name: '劉櫂豪', party: '無黨籍', city: 'taitung-county', photo: '/assets/2026縣市長/劉櫂豪.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'li-wu-ying-chih', name: '李吳穎智', party: '無黨籍', city: 'taitung-county', photo: '/assets/2026縣市長/李吳穎智.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 澎湖縣
    { id: 'wu-shu-chin', name: '吳淑瑾', party: '民進黨', city: 'penghu-county', photo: '/assets/2026縣市長/吳淑瑾.jpg', color: '#1b9431', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chen-chen-chung', name: '陳振中', party: '國民黨', city: 'penghu-county', photo: '/assets/2026縣市長/陳振中.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'yeh-chu-lin', name: '葉竹林', party: '無黨籍', city: 'penghu-county', photo: '/assets/2026縣市長/葉竹林.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chou-ni-an', name: '周倪安', party: '台灣團結聯盟', city: 'penghu-county', photo: '/assets/2026縣市長/周倪安.jpg', color: '#c89600', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chen-chin-chuan', name: '陳盡川', party: '無黨籍', city: 'penghu-county', photo: '/assets/2026縣市長/陳盡川.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'hsu-chih-fu', name: '許智富', party: '無黨籍', city: 'penghu-county', photo: '/assets/2026縣市長/許智富.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 金門縣
    { id: 'chen-yu-chen', name: '陳玉珍', party: '國民黨', city: 'kinmen-county', photo: '/assets/2026縣市長/陳玉珍.jpg', color: '#000080', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'lee-wen-liang', name: '李文良', party: '無黨籍', city: 'kinmen-county', photo: '/assets/2026縣市長/李文良.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'hung-ho-cheng', name: '洪和成', party: '無黨籍', city: 'kinmen-county', photo: '/assets/2026縣市長/洪和成.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'huang-shih-tuan', name: '黃世團', party: '無黨籍', city: 'kinmen-county', photo: '/assets/2026縣市長/黃世團.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chang-kuo-wei', name: '張國威', party: '無黨籍', city: 'kinmen-county', photo: '/assets/2026縣市長/張國威.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'liang-wen-tao', name: '梁文韜', party: '無黨籍', city: 'kinmen-county', photo: '/assets/2026縣市長/梁文韜.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    // 連江縣
    { id: 'wang-chung-ming', name: '王忠銘', party: '國民黨', city: 'lienchiang-county', photo: '/assets/2026縣市長/王忠銘.jpg', color: '#000080', status: 'incumbent', positive: 0, negative: 0, visible: true },
    { id: 'tsao-erh-yuan', name: '曹爾元', party: '無黨籍', city: 'lienchiang-county', photo: '/assets/2026縣市長/曹爾元.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true }
  ];

  taiwanMap = taiwan;

  // ==========================================
  // 【地方選舉專用】政黨代表色（地圖著色用）
  // 注意：不要動 candidate.color，折線圖 / 圓餅圖仍使用它
  // ==========================================
  private readonly PARTY_COLORS: { [party: string]: string } = {
    '國民黨': '#000080',
    '民進黨': '#1b9431',
    '民眾黨': '#28c8c8',
    '台灣團結聯盟': '#c89600',
    '台灣麻將最大黨': '#ea580c',
    '無黨籍': '#64748b'
  };
  private readonly DEFAULT_PARTY_COLOR = '#64748b'; // 其他小黨 / 未知

  getPartyColor(party?: string): string {
    return (party && this.PARTY_COLORS[party]) || this.DEFAULT_PARTY_COLOR;
  }

  // 依候選人取得政黨色（若 candidate 沒有 party，回頭去本地靜態清單查）
  getCandidatePartyColor(candidate: any): string {
    if (!candidate) return this.DEFAULT_PARTY_COLOR;

    let party = candidate.party;
    if (!party) {
      const local = this.allMayoralCandidates.find(
        c => c.id === candidate.id || c.name === candidate.name
      );
      party = local?.party;
    }
    return this.getPartyColor(party);
  }

  // ==========================================
  // 【地方選舉專用】縣市點擊 / 過濾
  // ==========================================
  onCountyClick(countyId: string, countyName?: string): void {
    this.selectedCounty = countyId;

    if (this.isLocalElection) {
      this.filterCandidatesByCounty(countyId);
    }
  }

  filterCandidatesByCounty(countyId: string): void {
    const source = this.allCandidatesWithStats?.length > 0
      ? this.allCandidatesWithStats
      : (this.allMayoralCandidates || []);

    let filtered = source.filter(c => this.isCountyMatch(c.city, countyId));

    // 關鍵安全鎖：若沒過濾到任何人，不讓 candidates 變成空陣列，回退顯示全資料
    this.candidates = filtered.length > 0 ? filtered : source;
    this.applyKpisFrom(this.candidates);

    this.updateCharts();
  }

  getCountyCandidateCount(countyId: string): number {
    if (!this.allMayoralCandidates) return 0;
    return this.allMayoralCandidates.filter(c => c.city === countyId).length;
  }

  getCandidateCountByType(countyId: string, type: 'incumbent' | 'announced' | 'potential'): number {
    if (!this.allMayoralCandidates) return 0;
    return this.allMayoralCandidates.filter(c =>
      (c.city === countyId || c.countyId === countyId) && c.status === type
    ).length;
  }

  // 安全且精確的縣市 ID 比對（修復新竹/嘉義縣市混淆問題）
  private isCountyMatch(candidateCity: string, targetCountyId: string): boolean {
    if (!candidateCity || !targetCountyId) return false;
    if (candidateCity === targetCountyId) return true;

    const cleanCandidate = candidateCity.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = targetCountyId.toLowerCase().replace(/[^a-z0-9]/g, '');

    return cleanCandidate === cleanTarget;
  }

  // ==========================================
  // 【地方選舉專用】全台地圖領先者著色 & Tooltip
  // ==========================================
  hoveredCounty: any = null;
  tooltipPos = { x: 0, y: 0 };

  getCandidatesForCounty(countyId: string): any[] {
    const source = this.allCandidatesWithStats?.length > 0
      ? this.allCandidatesWithStats
      : (this.allMayoralCandidates || []);

    return source.filter(c => this.isCountyMatch(c.city, countyId));
  }

  getCountyColor(countyId: string): string {
    if (this.selectedCounty === countyId && this.currentView === 'city') {
      return '#38bdf8';
    }

    const countyCandidates = this.getCandidatesForCounty(countyId);
    if (!countyCandidates || countyCandidates.length === 0) {
      return '#334155';
    }

    const sorted = [...countyCandidates].sort((a, b) =>
      (b.support_count ?? b.positive ?? 0) - (a.support_count ?? a.positive ?? 0)
    );

    const leader = sorted[0];
    const leaderSupport = leader.support_count ?? leader.positive ?? 0;

    // 有聲量才著色，顏色改用「領先者的政黨色」
    if (leaderSupport > 0) {
      return this.getCandidatePartyColor(leader);
    }

    return '#334155';
  }

  onCountyMouseEnter(location: any, event: MouseEvent): void {
    this.hoveredCounty = this.getCountyHoverInfo(location.id, location.name);
    this.updateTooltipPos(event);
  }

  onCountyMouseMove(event: MouseEvent): void {
    this.updateTooltipPos(event);
  }

  onCountyMouseLeave(): void {
    this.hoveredCounty = null;
  }

  private updateTooltipPos(event: MouseEvent): void {
    if (this.mapContainer) {
      const rect = this.mapContainer.nativeElement.getBoundingClientRect();

      const relativeMouseX = event.clientX - rect.left;
      const relativeMouseY = event.clientY - rect.top;

      let x = relativeMouseX + 15;
      let y = relativeMouseY + 15;

      const tooltipEstimateWidth = 340;
      const tooltipEstimateHeight = 60;

      if (x + tooltipEstimateWidth > rect.width) {
        x = relativeMouseX - tooltipEstimateWidth - 15;
        if (x < 10) x = 10;
      }

      if (y + tooltipEstimateHeight > rect.height) {
        y = relativeMouseY - tooltipEstimateHeight - 15;
        if (y < 10) y = 10;
      }

      this.tooltipPos = { x, y };
    }
  }

  private getCountyHoverInfo(countyId: string, countyName: string) {
    const candidates = this.getCandidatesForCounty(countyId);

    if (!candidates || candidates.length === 0) {
      return {
        name: countyName,
        leader: null,
        leaderSupport: 0,
        percentage: '0.0',
        totalCandidates: 0
      };
    }

    const sorted = [...candidates].sort((a, b) =>
      (b.support_count ?? b.positive ?? 0) - (a.support_count ?? a.positive ?? 0)
    );

    const leader = sorted[0];
    const leaderSupport = leader.support_count ?? leader.positive ?? 0;

    let totalStance = leader.area_total_stance || 0;
    if (!totalStance) {
      totalStance = candidates.reduce((sum, c) => sum + (c.support_count ?? c.positive ?? 0), 0);
    }

    const percentage = totalStance > 0 ? ((leaderSupport / totalStance) * 100).toFixed(1) : '0.0';

    return {
      name: countyName,
      leader: leaderSupport > 0 ? leader : null,
      leaderSupport: leaderSupport,
      percentage: percentage,
      totalCandidates: candidates.length
    };
  }

  // 取得候選人在該縣市的支持/反對佔比
  getCandidateSentimentBreakdown(candidate: any) {
    if (!candidate) {
      return { support: 0, oppose: 0, neutral: 0, total: 0, supportPct: 0, opposePct: 0, neutralPct: 0 };
    }

    const support = candidate.support_count ?? candidate.positive ?? 0;

    let areaTotal = candidate.area_total_stance || 0;
    if (!areaTotal && this.candidates && this.candidates.length > 0) {
      areaTotal = this.candidates.reduce((sum, c) => sum + (c.support_count ?? c.positive ?? 0), 0);
    }
    if (areaTotal === 0) areaTotal = support + (candidate.negative ?? 0);

    const oppose = areaTotal > support ? areaTotal - support : 0;

    const supportPct = areaTotal > 0 ? Number((support / areaTotal * 100).toFixed(1)) : 0;
    const opposePct = areaTotal > 0 ? Number((oppose / areaTotal * 100).toFixed(1)) : 0;

    return {
      support: support,
      oppose: oppose,
      neutral: 0,
      total: areaTotal,
      supportPct: supportPct,
      opposePct: opposePct
    };
  }

  // 【進入第二層：縣市戰情室】
  enterCityBattle(countyId: string, countyName?: string): void {
    this.selectedCounty = countyId;
    const found = this.countyList.find(c => c.id === countyId);
    this.selectedCountyName = countyName || (found ? found.name : countyId);
    this.currentView = 'city';

    const source = this.allCandidatesWithStats.length > 0
      ? this.allCandidatesWithStats
      : this.allMayoralCandidates;

    this.candidates = source.filter(c => c.city === countyId);
    this.applyKpisFrom(this.candidates);

    this.selectedCandidate = null;
    this.selectedCandidateForTimeChart = null;

    this.updateCharts();
  }

  // 【進入第三層：候選人個人深度分析】
  enterCandidateDetail(candidate: any): void {
    this.selectedCandidate = candidate;
    this.currentView = 'candidate';
    if (candidate && candidate.id) {
      this.selectCandidateForTimeChart(candidate.id);
    }
  }

  // 【返回第一層：全台大地圖】
  backToFullMap(): void {
    this.currentView = 'map';
    this.selectedCounty = null;
    this.selectedCountyName = '';
    this.selectedCandidate = null;
    this.selectedCandidateForTimeChart = null;

    this.candidates = this.allCandidatesWithStats.length > 0
      ? this.allCandidatesWithStats
      : this.allMayoralCandidates;

    this.resetTotalKpis();
  }

  // 【返回第二層：縣市戰情室】
  backToCity(): void {
    this.currentView = 'city';
    this.selectedCandidate = null;
    this.selectedCandidateForTimeChart = null;
    this.updateCharts();
  }

  // ==========================================
  // 共用：選舉相關屬性
  // ==========================================
  electionId: string = '';
  election: any = null;
  electionData: any = null;

  // 候選人數據
  candidates: any[] = [];
  selectedCandidates: string[] = [];
  // 【地方選舉專用】後端 Atlas 聚合後的完整候選人清單
  allCandidatesWithStats: any[] = [];

  // 圖表數據
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  // 【地方選舉專用】「網友數比較分析」
  userCountChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // 時間圖表模式控制
  selectedCandidateForTimeChart: string | null = null; // null = 顯示所有候選人總網友數

  // 時間篩選相關屬性
  currentFilter: string = '1year';
  isLoadingTimeData: boolean = false;

  // 日期範圍相關屬性
  startDate: string = '';
  endDate: string = '';

  // 後端數據相關屬性
  timeSeriesStats: any = null;

  // 動態圖表選項配置
  private dynamicChartOptions: any = {
    maxTicksLimit: 20,
    autoSkip: false,
    maxRotation: 45
  };

  // 圖表選項 - 動態調整標籤顯示
  get lineChartOptions(): any {
    const component = this;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          // 地方選舉：線條 <= 12 才顯示；黨主席：永遠顯示
          display: this.isLocalElection ? this.lineChartData.datasets.length <= 12 : true,
          position: 'top' as const,
          align: 'start' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            boxWidth: 8,
            boxHeight: 8,
            color: '#94a3b8',
            font: {
              size: 11
            }
          },
          maxWidth: 800,
          fullSize: true
        },
        interaction: {
          mode: 'nearest' as const,
          intersect: true,
        },
        tooltip: {
          enabled: true,
          mode: 'nearest' as const,
          intersect: true,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 10,
          displayColors: true,
          padding: {
            top: 16,
            right: 20,
            bottom: 16,
            left: 20
          },
          titleFont: {
            size: 16,
            weight: 'bold' as const
          },
          bodyFont: {
            size: 14
          },
          titleSpacing: 10,
          bodySpacing: 8,
          boxWidth: 12,
          boxHeight: 12,
          boxPadding: 6,
          maxWidth: 300,
          filter: (tooltipItem: any) => {
            return tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined;
          },
          positioner: (elements: any[], eventPosition: any) => {
            const tooltip = elements[0];
            if (!tooltip || !tooltip.chart) {
              return false;
            }

            const chart = tooltip.chart;
            const chartCanvas = chart.canvas;
            const chartRect = chartCanvas.getBoundingClientRect();

            const tooltipWidth = tooltip.width || 280;
            const tooltipHeight = tooltip.height || 180;

            const canvasX = chartRect.left + eventPosition.x;
            const canvasY = chartRect.top + eventPosition.y;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const offsetX = 15;
            const margin = 30;

            let tooltipY = canvasY - tooltipHeight / 2;
            let tooltipX;

            const rightSpaceAvailable = viewportWidth - canvasX - margin;

            if (rightSpaceAvailable >= tooltipWidth + offsetX) {
              tooltipX = canvasX + offsetX;
            } else {
              tooltipX = canvasX - tooltipWidth - offsetX;
              if (tooltipX < margin) {
                tooltipX = margin;
              }
            }

            if (tooltipX + tooltipWidth > viewportWidth - margin) {
              tooltipX = viewportWidth - tooltipWidth - margin;
            }
            if (tooltipX < margin) {
              tooltipX = margin;
            }

            if (tooltipY < 20) {
              tooltipY = 20;
            } else if (tooltipY + tooltipHeight > viewportHeight - 20) {
              tooltipY = viewportHeight - tooltipHeight - 20;
              if (tooltipY < 20) {
                tooltipY = 20;
              }
            }

            const relativeX = tooltipX - chartRect.left;
            const relativeY = tooltipY - chartRect.top;

            return {
              x: relativeX,
              y: relativeY
            };
          },
          callbacks: {
            title: (tooltipItems: any[]) => {
              if (tooltipItems && tooltipItems.length > 0) {
                const label = tooltipItems[0].label;
                return `日期：${label}`;
              }
              return '';
            },
            label: (context: any) => {
              const dataset = context.dataset;
              const value = context.parsed.y;
              const label = dataset.label || '未知';

              const formattedValue = value.toLocaleString('zh-TW');

              if (component.selectedCandidateForTimeChart && dataset.label) {
                const positiveData = dataset.positiveData;
                const negativeData = dataset.negativeData;

                if (positiveData && negativeData && context.dataIndex !== undefined) {
                  const positive = positiveData[context.dataIndex] || 0;
                  const negative = negativeData[context.dataIndex] || 0;
                  const total = positive + negative;

                  return [
                    `${label}: ${formattedValue}`,
                    `  正面: ${positive.toLocaleString('zh-TW')}`,
                    `  負面: ${negative.toLocaleString('zh-TW')}`,
                    `  總計: ${total.toLocaleString('zh-TW')}`
                  ];
                }
              }

              return `${label} - 累計評論總網友數: ${formattedValue}`;
            },
            afterLabel: (context: any) => {
              if (!component.selectedCandidateForTimeChart) {
                const allDatasets = context.chart.data.datasets;
                const dataIndex = context.dataIndex;
                const allValues = allDatasets
                  .map((ds: any) => ds.data[dataIndex])
                  .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
                const currentValue = context.parsed.y;

                if (allValues.length > 1) {
                  const sortedValues = [...allValues].sort((a: number, b: number) => b - a);
                  const rank = sortedValues.indexOf(currentValue) + 1;
                  return `排名：第 ${rank} 名 / ${allValues.length} 位候選人`;
                }
              }
              return '';
            },
            labelColor: (context: any) => {
              return {
                borderColor: context.dataset.borderColor || context.dataset.backgroundColor,
                backgroundColor: context.dataset.borderColor || context.dataset.backgroundColor
              };
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '時間',
            color: '#94a3b8',
            font: {
              size: 12,
              weight: 'bold' as const
            },
            padding: {
              top: 10,
              bottom: 5
            }
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 10
            },
            maxTicksLimit: component.dynamicChartOptions.maxTicksLimit,
            autoSkip: component.dynamicChartOptions.autoSkip,
            maxRotation: component.dynamicChartOptions.maxRotation,
            minRotation: 0,
            padding: 8
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.12)',
            display: true
          },
          border: { color: 'rgba(148, 163, 184, 0.25)' }
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: '累計評論總網友數',
            color: '#94a3b8',
            font: {
              size: 12,
              weight: 'bold' as const
            },
            padding: {
              top: 5,
              right: 10
            }
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 10
            },
            maxTicksLimit: 8,
            padding: 8,
            callback: function(value: any) {
              if (value >= 10000) {
                return (value / 10000).toFixed(1) + '萬';
              }
              return value.toLocaleString('zh-TW');
            }
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.12)',
            display: true
          },
          border: { color: 'rgba(148, 163, 184, 0.25)' }
        }
      }
    };
  }

  // Y 軸標題會在 loadElectionData() 依模式切換：
  //   地方選舉 = '網友數量'；黨主席 = '網友數'
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 16,
          boxWidth: 12,
          color: '#94a3b8'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(7, 19, 26, 0.92)',
        titleColor: '#5eead4',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(45, 212, 191, 0.4)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.12)'
        },
        ticks: { color: '#94a3b8' },
        border: { color: 'rgba(148, 163, 184, 0.25)' },
        title: {
          display: true,
          text: '候選人',
          color: '#94a3b8',
          font: {
            size: 13,
            weight: 'bold'
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.12)'
        },
        ticks: { color: '#94a3b8' },
        border: { color: 'rgba(148, 163, 184, 0.25)' },
        title: {
          display: true,
          text: '網友數量',
          color: '#94a3b8',
          font: {
            size: 13,
            weight: 'bold'
          }
        },
        beginAtZero: true
      }
    }
  };

  // 控制選項
  selectedTimeRange: string = '30_days';
  availableIntervals: string[] = [];
  timeRanges = [
    { value: '7_days', label: '近7天' },
    { value: '30_days', label: '近30天' },
    { value: '90_days', label: '近90天' },
    { value: '365_days', label: '近一年' }
  ];

  // 狀態
  isLoading = false;
  totalCandidates = 0;
  totalSentiment = 0;
  averageSentiment = 0;

  // 顏色配置（非地方選舉時的通用色盤）
  colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private electionService: ElectionService
  ) { }

  // ==========================================
  // 初始化
  // ==========================================
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.electionId = params['id'];

      // 【地方選舉專用】地圖 viewBox
      if (this.isLocalElection && this.taiwanMap && (this.taiwanMap as any).viewBox) {
        this.viewBox = (this.taiwanMap as any).viewBox;
      }

      if (this.electionId) {
        // 地方選舉第一層是全台地圖，不要預設台北，否則 KPI 會變成 3 人
        this.loadElectionData();
      } else {
        this.router.navigate(['/election-analysis']);
      }
    });
  }

  loadElectionData(): void {
    this.isLoading = true;

    const electionConfig = getElectionById(this.electionId);
    if (electionConfig) {
      this.election = electionConfig;
      this.electionData = electionConfig;

      // 初始化候選人數據
      // 地方選舉：color 跟隨政黨色（與地圖著色一致）
      // 其他選舉（黨主席等）：維持原本的通用色盤，依出場順序分配
      this.candidates = electionConfig.candidates.map((candidate: any, index: number) => ({
        ...candidate,
        visible: true,
        color: this.isLocalElection
          ? this.getPartyColor(candidate.party)
          : this.colors[index % this.colors.length]
      }));

      this.totalCandidates = electionConfig.candidates.length;

      // 各自規定：地方選舉傳「中文名字」給 MongoDB；黨主席傳 id
      this.selectedCandidates = this.isLocalElection
        ? this.candidates.map(c => c.name)
        : this.candidates.map(c => c.id);

      // 長條圖 Y 軸標題（各自規定）
      const yScale: any = (this.barChartOptions.scales as any)?.y;
      if (yScale?.title) {
        yScale.title.text = this.isLocalElection ? '網友數量' : '網友數';
      }

      // 初始化日期範圍
      this.updateDateRangeForPeriod(this.currentFilter);

      // 載入完整的分析數據（包含時間序列）
      this.loadElectionAnalysisData();
    } else {
      console.error('找不到選舉配置:', this.electionId);
      this.isLoading = false;
      this.router.navigate(['/election-analysis']);
    }
  }

  // ==========================================
  // 載入分析資料（依模式分流）
  // ==========================================
  loadElectionAnalysisData(timeRange?: any): void {
    const days = timeRange || '365';
    if (this.isLocalElection) {
      this.loadElectionAnalysisDataLocal(days);
    } else {
      this.loadElectionAnalysisDataChairman(days);
    }
  }

  // 【地方選舉版】
  private loadElectionAnalysisDataLocal(days: any): void {
    this.isLoading = true;

    const targetCandidateNames = this.candidates.map(c => c.name);
    console.log('📊 本次選舉候選人：', targetCandidateNames);

    this.electionService
      .getElectionAnalysisData(targetCandidateNames, days)
      .subscribe({
        next: (res: any) => {
          const rawList: any[] =
            res?.candidates ||
            res?.data ||
            (Array.isArray(res) ? res : []);

          // 以目前選舉設定為主
          this.allCandidatesWithStats = this.candidates.map(
            (configCandidate: any) => {

              const backendItem = rawList.find(
                (item: any) =>
                  item.name === configCandidate.name ||
                  item.candidate_name === configCandidate.name ||
                  item.id === configCandidate.id
              );

              if (!backendItem) {
                return {
                  ...configCandidate,
                  positive: 0,
                  negative: 0,
                  support_count: 0,
                  visible: true,
                  time_series_stats: {
                    stats_points: []
                  }
                };
              }

              const pos =
                backendItem.positive ??
                backendItem.positive_count ??
                backendItem.support_count ??
                0;

              const neg =
                backendItem.negative ??
                backendItem.negative_count ??
                backendItem.oppose_count ??
                0;

              return {
                ...configCandidate,
                ...backendItem,

                // 保留前端設定
                name: configCandidate.name,
                id: configCandidate.id,
                party: configCandidate.party,
                photo: configCandidate.photo,

                positive: pos,
                negative: neg,

                positive_rate:
                  backendItem.positive_rate ??
                  (
                    pos + neg > 0
                      ? Math.round((pos / (pos + neg)) * 1000) / 10
                      : 0
                  ),

                platform_breakdown:
                  backendItem.platform_breakdown ||
                  backendItem.platforms || {
                    fb: backendItem.fb || 0,
                    threads: backendItem.threads || 0,
                    youtube: backendItem.youtube || 0,
                    ptt: backendItem.ptt || 0
                  },

                time_series_stats:
                  backendItem.time_series_stats || {
                    stats_points:
                      backendItem.time_series ||
                      backendItem.stats_points ||
                      []
                  },

                visible: true
              };
            }
          );

          if (this.currentView === 'city' && this.selectedCounty) {
            this.filterCandidatesByCounty(this.selectedCounty);
          } else {
            this.candidates = this.allCandidatesWithStats;
            this.resetTotalKpis();
          }

          this.isLoading = false;

          console.log(
            '✅ 本次選舉實際顯示候選人：',
            this.candidates.map(c => c.name)
          );
        },

        error: (err: any) => {
          console.error('❌ 載入選舉分析失敗：', err);

          this.allCandidatesWithStats = this.candidates.map(c => ({
            ...c,
            positive: 0,
            negative: 0,
            support_count: 0,
            visible: true,
            time_series_stats: {
              stats_points: []
            }
          }));

          this.candidates = this.allCandidatesWithStats;
          this.resetTotalKpis();
          this.isLoading = false;
        }
      });
  }

  // 【黨主席版（學長）】
  
  private loadElectionAnalysisDataChairman(days: any): void {
    const candidateNames = this.election.candidates.map((c: any) => c.name);
    this.electionService.getElectionAnalysisData(candidateNames, days).subscribe({
      next: (data: any) => {
        // 1. 安全提取 candidates 陣列（相容多種 API 回傳格式）
        const candidateList: any[] = 
          data?.candidates || 
          data?.data?.candidates || 
          data?.data || 
          (Array.isArray(data) ? data : []);

        // 2. 使用安全陣列進行 mapping
        this.candidates = candidateList.map((candidate: any, index: number) => {
          const configCandidate = this.election.candidates.find((c: any) => c.name === candidate.name);
          return {
            ...candidate,
            ...configCandidate,
            visible: true,
            color: this.colors[index % this.colors.length]
          };
        });

        // 3. 安全讀取統計數據
        this.totalCandidates = data?.statistics?.total_candidates ?? this.candidates.length;
        this.totalSentiment = data?.statistics?.total_sentiment ?? 0;
        this.averageSentiment = data?.statistics?.average_sentiment ?? 0;

        this.timeSeriesStats = this.buildTimeSeriesStatsFromCandidates();

        console.log('🔍 選舉分析數據載入:', {
          hasTimeSeriesStats: !!this.timeSeriesStats,
          timeSeriesStatsKeys: this.timeSeriesStats ? Object.keys(this.timeSeriesStats) : [],
          candidatesCount: this.candidates.length
        });

        this.availableIntervals = ['7_days', '14_days', '30_days', '90_days', '180_days', '365_days'];

        this.processCandidatesTimeSeriesData();

        this.updateBarChart();

        setTimeout(() => {
          if (this.lineChartComponent?.chart) {
            this.lineChartComponent.chart.update('resize');
          }
          if (this.barChartComponent?.chart) {
            this.barChartComponent.chart.update('resize');
          }
        }, 100);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('載入選舉分析數據失敗:', error);
        this.isLoading = false;
      }
    });
  }

  loadChartData(): void {
    this.updateLineChart();
    this.updateBarChart();
    this.updateUserCountChart();
  }

  updateCharts(): void {
    this.updateLineChart();
    this.updateBarChart();
    this.updateUserCountChart();
  }

  // ==========================================
  // 折線圖（依模式分流）
  // ==========================================
  updateLineChart(): void {
    if (this.isLocalElection) {
      this.updateLineChartLocal();
    } else {
      this.updateLineChartChairman();
    }
  }

  // 【地方選舉版】
  private updateLineChartLocal(): void {
    const visibleCandidates = this.candidates.filter(c => c.visible);

    if (visibleCandidates.length === 0) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    if (this.selectedCandidateForTimeChart) {
      const candidate = visibleCandidates.find(c => c.id === this.selectedCandidateForTimeChart);

      // 強制使用後端 stats_points 作為唯一依據
      if (candidate && candidate.time_series_stats && candidate.time_series_stats.stats_points) {

        const statsPoints = candidate.time_series_stats.stats_points;
        const labels = statsPoints.map((p: any) => p.date);

        const positiveData = statsPoints.map((p: any) => p.sentiment_counts?.positive ?? p.positive ?? 0);
        const negativeData = statsPoints.map((p: any) => p.sentiment_counts?.negative ?? p.negative ?? 0);

        this.lineChartData = {
          labels: labels,
          datasets: [
            {
              label: '正面',
              data: positiveData,
              positiveData: positiveData,
              negativeData: negativeData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#10b981',
              pointRadius: 4,
              pointHoverRadius: 6
            } as any,
            {
              label: '負面',
              data: negativeData,
              positiveData: positiveData,
              negativeData: negativeData,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ef4444',
              pointRadius: 4,
              pointHoverRadius: 6
            } as any
          ]
        };

        this.updateChartOptionsForDataPoints(labels.length);
      } else {
        this.lineChartData = { labels: [], datasets: [] };
      }
    } else {
      this.processCandidatesTimeSeriesData();
    }
  }

  // 【黨主席版（學長）】
  private updateLineChartChairman(): void {
    const visibleCandidates = this.candidates.filter(c => c.visible);

    if (visibleCandidates.length === 0) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    if (this.selectedCandidateForTimeChart) {
      const candidate = visibleCandidates.find(c => c.id === this.selectedCandidateForTimeChart);
      if (candidate && candidate.time_series_stats) {
        const originalData = candidate.time_series_stats;
        const pointCount = originalData.labels ? originalData.labels.length : 0;
        const labels = this.generateTimeAxisLabels(pointCount, this.currentFilter);

        const processedDatasets = (originalData.datasets || []).map((dataset: any) => {
          if (dataset.label === '支持' || dataset.label === '正面') {
            return {
              ...dataset,
              label: '支持',
              positiveData: dataset.data,
              negativeData: []
            };
          } else if (dataset.label === '反對' || dataset.label === '負面') {
            return {
              ...dataset,
              label: '反對',
              positiveData: [],
              negativeData: dataset.data
            };
          }
          return dataset;
        });

        if (processedDatasets.length >= 2) {
          const supportDataset = processedDatasets.find((ds: any) => ds.label === '支持' || ds.label === '正面');
          const opposeDataset = processedDatasets.find((ds: any) => ds.label === '反對' || ds.label === '負面');

          if (supportDataset && opposeDataset) {
            supportDataset.positiveData = supportDataset.data;
            supportDataset.negativeData = opposeDataset.data;
            opposeDataset.positiveData = supportDataset.data;
            opposeDataset.negativeData = opposeDataset.data;
          }
        }

        this.lineChartData = {
          labels: labels,
          datasets: processedDatasets
        };

        this.updateChartOptionsForDataPoints(labels.length);
      } else {
        this.lineChartData = { labels: [], datasets: [] };
      }
    } else {
      this.processCandidatesTimeSeriesData();
    }
  }

  // ==========================================
  // 長條圖（依模式分流）
  // ==========================================
  updateBarChart(): void {
    if (this.isLocalElection) {
      this.updateBarChartLocal();
    } else {
      this.updateBarChartChairman();
    }
  }

  // 【地方選舉版】各平台正/負面 (P/N)
  private updateBarChartLocal(): void {
    const visibleCandidates = this.candidates.filter(c => c.visible);

    if (visibleCandidates.length === 0) {
      this.barChartData = { labels: [], datasets: [] };
      return;
    }

    const labels = visibleCandidates.map(c => c.name);
    const datasets: any[] = [];

    this.platforms.forEach(platform => {
      const pLower = platform.toLowerCase();

      const positiveData = visibleCandidates.map(c => {
        const breakdown = c.platform_breakdown?.[pLower] || c.platforms?.[pLower];
        if (typeof breakdown === 'object' && breakdown !== null) {
          return Number(breakdown.positive ?? breakdown.p ?? 0);
        }
        return 0;
      });

      const negativeData = visibleCandidates.map(c => {
        const breakdown = c.platform_breakdown?.[pLower] || c.platforms?.[pLower];
        if (typeof breakdown === 'object' && breakdown !== null) {
          return Number(breakdown.negative ?? breakdown.n ?? 0);
        }
        return 0;
      });

      const baseColor = this.platformColors[platform] || '#38bdf8';

      datasets.push({
        label: `${platform.toUpperCase()} - 正面 (P)`,
        data: positiveData,
        backgroundColor: baseColor,
        borderColor: baseColor,
        borderWidth: 1
      });

      datasets.push({
        label: `${platform.toUpperCase()} - 負面 (N)`,
        data: negativeData,
        backgroundColor: this.adjustColorOpacity(baseColor, 0.4),
        borderColor: baseColor,
        borderWidth: 1
      });
    });

    this.barChartData = { labels, datasets };
  }

  // 【黨主席版（學長）】正/負面網友數
  private updateBarChartChairman(): void {
    const visibleCandidates = this.candidates.filter(c => c.visible);

    if (visibleCandidates.length === 0) {
      this.barChartData = { labels: [], datasets: [] };
      return;
    }

    const labels = visibleCandidates.map(c => c.name);
    const positiveData = visibleCandidates.map(c => c.positive ?? 0);
    const negativeData = visibleCandidates.map(c => c.negative ?? 0);

    this.barChartData = {
      labels,
      datasets: [
        {
          label: '正面網友數',
          data: positiveData,
          backgroundColor: '#28a745',
          borderColor: '#28a745'
        },
        {
          label: '負面網友數',
          data: negativeData,
          backgroundColor: '#dc3545',
          borderColor: '#dc3545'
        }
      ]
    };
  }

  // 【地方選舉專用】「網友數比較分析」；黨主席模式不使用，直接略過
  updateUserCountChart(): void {
    if (!this.isLocalElection) {
      return;
    }

    const visibleCandidates = this.candidates.filter(c => c.visible);

    if (visibleCandidates.length === 0) {
      this.userCountChartData = { labels: [], datasets: [] };
      return;
    }

    const labels = visibleCandidates.map(c => c.name);
    const datasets: any[] = [];

    this.platforms.forEach(platform => {
      const pLower = platform.toLowerCase();

      const userCountData = visibleCandidates.map(c => {
        const counts = c.platform_user_counts;
        if (counts && typeof counts === 'object') {
          return Number(counts[pLower] ?? 0);
        }
        return 0;
      });

      const baseColor = this.platformColors[platform] || '#38bdf8';

      datasets.push({
        label: `${platform.toUpperCase()} - 支持網友數`,
        data: userCountData,
        backgroundColor: baseColor,
        borderColor: baseColor,
        borderWidth: 1
      });
    });

    this.userCountChartData = { labels, datasets };
  }

  // 輔助函式：動態調整顏色透明度
  private adjustColorOpacity(hex: string, alpha: number): string {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  // 處理後端回傳的 time_series 數據 - 合併兩條線為總網友數（累計趨勢）
  private processTimeSeriesData(timeSeriesData: any): void {
    if (!timeSeriesData.labels || !timeSeriesData.datasets || timeSeriesData.datasets.length < 2) {
      console.warn('時間序列數據格式不正確');
      return;
    }

    const labels = timeSeriesData.labels;
    const negativeData = timeSeriesData.datasets[0].data;
    const positiveData = timeSeriesData.datasets[1].data;

    const totalData = [];
    for (let i = 0; i < labels.length; i++) {
      totalData.push((negativeData[i] || 0) + (positiveData[i] || 0));
    }

    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          label: '累計評論總網友數',
          data: totalData,
          positiveData: positiveData,
          negativeData: negativeData,
          candidateName: '累計評論總網友數',
          borderColor: '#0d9488',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true
        } as any
      ]
    };
  }

  toggleCandidateVisibility(candidateId: string): void {
    const candidate = this.candidates.find(c => c.id === candidateId);
    if (candidate) {
      candidate.visible = !candidate.visible;
      this.updateCharts();
    }
  }

  // 點擊候選人切換時間圖表模式（依模式分流）
  selectCandidateForTimeChart(candidateId: string | null): void {
    this.selectedCandidateForTimeChart = candidateId;

    if (this.isLocalElection) {
      // 【地方選舉版】主清單 API 已含完整時間序列，直接畫圖，不再呼叫專屬端點
      this.updateLineChart();
    } else {
      // 【黨主席版】選了候選人就載入該候選人詳細時間序列
      if (candidateId) {
        this.loadCandidateTimeSeriesData(candidateId);
      } else {
        this.updateLineChart();
      }
    }
  }

  // 返回總覽
  returnToOverview(): void {
    this.selectedCandidateForTimeChart = null;

    const timeRangeMap: { [key: string]: string } = {
      'week': '7',
      '2weeks': '14',
      'month': '30',
      '3months': '90',
      '6months': '180',
      '1year': '365',
      'all': '365'
    };

    const timeRange = timeRangeMap[this.currentFilter] || '365';

    this.isLoadingTimeData = true;
    this.loadElectionAnalysisData(timeRange);

    setTimeout(() => {
      this.isLoadingTimeData = false;
    }, 500);
  }

  onTimeRangeChange(): void {
    if (!this.timeSeriesStats) {
      return;
    }

    const timeRangeMap: { [key: string]: string } = {
      '7_days': '7',
      '14_days': '14',
      '30_days': '30',
      '90_days': '90',
      '180_days': '180',
      '365_days': '365'
    };

    const timeRange = timeRangeMap[this.selectedTimeRange] || '365';
    this.loadElectionAnalysisData(timeRange);
  }

  toggleAllCandidates(): void {
    const allVisible = this.candidates.every(c => c.visible);
    this.candidates.forEach(c => c.visible = !allVisible);
    this.updateCharts();
  }

  resetFilters(): void {
    this.selectedTimeRange = '30_days';
    this.candidates.forEach(c => c.visible = true);
    this.loadChartData();
  }

  // ==========================================
  // 支持率（依模式分流）
  // ==========================================
  getSupportPercentage(candidate: any): string {
    if (!candidate) return '0.0';

    if (this.isLocalElection) {
      // 【地方選舉版】得票率（不可誤用 positive_rate）
      const rate = candidate.support_rate ?? candidate.support_percentage;
      if (rate !== undefined && rate !== null && !isNaN(Number(rate))) {
        return Number(rate).toFixed(1);
      }

      const support = candidate.support_count ?? candidate.positive ?? 0;
      const total = candidate.area_total_stance || (support + (candidate.oppose_count ?? candidate.negative ?? 0));

      return total > 0 ? (support / total * 100).toFixed(1) : '0.0';
    }

    // 【黨主席版（學長）】正面 / (正面 + 負面)
    const positive = candidate.positive ?? 0;
    const negative = candidate.negative ?? 0;
    const total = positive + negative;

    if (total === 0) return '0.0';

    return ((positive / total) * 100).toFixed(1);
  }

  // ==========================================
  // 【地方選舉專用】縣市圓餅圖
  // ==========================================
  getCurrentCountyBreakdown(): Array<{ candidate_name: string, count: number, percentage: number }> {
    if (!this.candidates || this.candidates.length === 0) return [];

    let areaTotal = 0;
    let totalCandidateSupport = 0;

    const breakdown = this.candidates.map(c => {
      const count = c.support_count ?? c.positive ?? 0;
      const percentageStr = this.getSupportPercentage(c);

      totalCandidateSupport += count;

      if (!areaTotal) {
        areaTotal = c.area_total_stance || 0;
      }

      return {
        candidate_name: c.name,
        count: count,
        percentage: Number(percentageStr)
      };
    }).sort((a, b) => b.count - a.count);

    if (!areaTotal) {
      areaTotal = this.candidates.reduce((sum, c) => sum + (c.support_count ?? c.positive ?? 0) + (c.oppose_count ?? c.negative ?? 0), 0);
    }

    const neutralCount = areaTotal > totalCandidateSupport ? (areaTotal - totalCandidateSupport) : 0;

    if (neutralCount > 0) {
      const neutralPercentage = Number(((neutralCount / areaTotal) * 100).toFixed(1));
      breakdown.push({
        candidate_name: '中立 / 未表態',
        count: neutralCount,
        percentage: neutralPercentage
      });
    }

    return breakdown;
  }

  getColorForCandidateName(name: string): string {
    if (name === '中立 / 未表態') {
      return '#475569';
    }
    const candidate = this.candidates.find(c => c.name === name);
    return candidate?.color || '#64748b';
  }

  getCountyConicGradientStyle(): string {
    const breakdown = this.getCurrentCountyBreakdown();

    if (breakdown.length === 0) {
      return 'conic-gradient(#1e293b 0% 100%)';
    }

    let currentPercentage = 0;
    const gradientParts = breakdown.map(item => {
      const color = this.getColorForCandidateName(item.candidate_name);
      const start = currentPercentage;
      const end = currentPercentage + item.percentage;
      currentPercentage = end;

      return `${color} ${start}% ${end}%`;
    });

    if (currentPercentage < 100) {
      gradientParts.push(`#1e293b ${currentPercentage}% 100%`);
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  }

  // ==========================================
  // 返回（依模式分流）
  // ==========================================
  goBack(): void {
    // 【黨主席版（學長）】直接回選舉分析中心
    if (!this.isLocalElection) {
      this.router.navigate(['/election-analysis']);
      return;
    }

    // 【地方選舉版】三層返回
    if (this.currentView === 'candidate') {
      this.currentView = 'city';
      this.selectedCandidate = null;
      this.selectedCandidateForTimeChart = null;
      this.updateCharts();

    } else if (this.currentView === 'city') {
      this.currentView = 'map';
      this.selectedCounty = null;
      this.selectedCountyName = '';
      this.selectedCandidate = null;
      this.selectedCandidateForTimeChart = null;

      this.candidates = this.allCandidatesWithStats.length > 0
        ? this.allCandidatesWithStats
        : this.allMayoralCandidates;
      this.resetTotalKpis();

    } else {
      this.router.navigate(['/election-analysis']);
    }
  }

  // 【地方選舉專用】重設全台 KPI
  resetTotalKpis(): void {
    const source = this.allCandidatesWithStats && this.allCandidatesWithStats.length > 0
      ? this.allCandidatesWithStats
      : this.allMayoralCandidates;
    this.applyKpisFrom(source);
  }

  // 從候選人清單算出 KPI：人數、累計評論、平均
  private applyKpisFrom(source: any[]): void {
    if (!source || source.length === 0) {
      this.totalCandidates = 0;
      this.totalSentiment = 0;
      this.averageSentiment = 0;
      return;
    }

    this.totalCandidates = source.length;
    this.totalSentiment = source.reduce((sum, c) => sum + this.candidateVolume(c), 0);
    this.averageSentiment = Math.round(this.totalSentiment / this.totalCandidates);
  }

  // 優先用 API 的 total（含中立），再退回正負面或支持數
  private candidateVolume(c: any): number {
    const pn =
      (Number(c.positive) || 0) +
      (Number(c.negative) || 0) +
      (Number(c.neutral) || 0);
    return Number(c.total) || pn || Number(c.support_count) || 0;
  }

  // 載入特定候選人的時間序列數據（依模式分流）
  private loadCandidateTimeSeriesData(candidateId: string): void {
    const candidate = this.candidates.find(c => c.id === candidateId);
    if (!candidate) {
      console.error('找不到候選人:', candidateId);
      return;
    }

    if (this.isLocalElection) {
      // 【地方選舉版】先用主清單資料繪圖，專屬端點失敗也不清空圖表
      if (candidate.time_series_stats && candidate.time_series_stats.stats_points?.length) {
        this.updateLineChart();
      }

      this.isLoadingTimeData = true;
      const days = this.getDaysFromTimeRange();

      this.electionService.getCandidateTimeSeriesData(candidate.name, days).subscribe({
        next: (data) => {
          if (data && data.time_series) {
            candidate.time_series_stats = data.time_series;
            this.updateLineChart();
          } else if (!candidate.time_series_stats?.stats_points?.length) {
            console.warn('候選人時間序列數據為空:', candidate.name);
            this.lineChartData = { labels: [], datasets: [] };
          }

          this.isLoadingTimeData = false;
        },
        error: (error) => {
          console.error('載入候選人時間序列數據失敗，改用主清單既有資料:', error);
          this.isLoadingTimeData = false;
        }
      });
      return;
    }

    // 【黨主席版（學長）】
    this.isLoadingTimeData = true;
    const days = this.getDaysFromTimeRange();

    console.log('🔍 載入候選人個人數據:', {
      candidateName: candidate.name,
      days: days,
      currentFilter: this.currentFilter
    });

    this.electionService.getCandidateTimeSeriesData(candidate.name, days).subscribe({
      next: (data) => {
        console.log('🔍 候選人時間序列數據載入:', candidate.name, data);

        if (data && data.time_series) {
          candidate.time_series_stats = data.time_series;
          this.updateLineChart();
        } else {
          console.warn('候選人時間序列數據為空:', candidate.name);
          this.lineChartData = { labels: [], datasets: [] };
        }

        this.isLoadingTimeData = false;
      },
      error: (error) => {
        console.error('載入候選人時間序列數據失敗:', error);
        this.lineChartData = { labels: [], datasets: [] };
        this.isLoadingTimeData = false;
      }
    });
  }

  // 根據時間範圍獲取天數
  private getDaysFromTimeRange(): number {
    switch (this.currentFilter) {
      case 'week': return 7;
      case '2weeks': return 14;
      case 'month': return 30;
      case '3months': return 90;
      case '6months': return 180;
      case '1year': return 365;
      default: return 365;
    }
  }

  // 從候選人數據構建時間序列統計
  private buildTimeSeriesStatsFromCandidates(): any {
    if (!this.candidates || this.candidates.length === 0) {
      return null;
    }

    const firstCandidate = this.candidates[0];
    if (!firstCandidate.time_series_stats) {
      return null;
    }

    return firstCandidate.time_series_stats;
  }

  // ==========================================
  // 全體時間序列（依模式分流）
  // ==========================================
  private processCandidatesTimeSeriesData(): void {
    if (this.isLocalElection) {
      this.processCandidatesTimeSeriesDataLocal();
    } else {
      this.processCandidatesTimeSeriesDataChairman();
    }
  }

  // 【地方選舉版】stats_points 結構
  private processCandidatesTimeSeriesDataLocal(): void {
    if (!this.candidates || this.candidates.length === 0) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    const candidatesWithData = this.candidates.filter(c =>
      c.visible && c.time_series_stats && c.time_series_stats.stats_points && c.time_series_stats.stats_points.length > 0
    );

    if (candidatesWithData.length === 0) {
      const emptyLabels = this.generateTimeAxisLabels(7, this.currentFilter);
      this.lineChartData = { labels: emptyLabels, datasets: [] };
      return;
    }

    // 【第一層：全台選情地圖】加總所有候選人數據
    if (this.currentView === 'map') {
      const dateMap = new Map<string, number>();

      candidatesWithData.forEach(candidate => {
        const points = candidate.time_series_stats.stats_points || [];
        points.forEach((p: any) => {
          if (p.date) {
            const count = p.total_count ?? ((p.sentiment_counts?.positive || 0) + (p.sentiment_counts?.negative || 0));
            dateMap.set(p.date, (dateMap.get(p.date) || 0) + count);
          }
        });
      });

      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const totalData = sortedDates.map(date => dateMap.get(date) || 0);

      this.lineChartData = {
        labels: sortedDates,
        datasets: [
          {
            label: '全台累計評論總網友數',
            data: totalData,
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.15)',
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#22d3ee',
            pointBorderColor: '#22d3ee',
            pointRadius: 3,
            pointHoverRadius: 6
          } as any
        ]
      };

      this.updateChartOptionsForDataPoints(sortedDates.length);
      return;
    }

    // 【第二層：縣市戰情室】各候選人獨立線條
    const firstCandidate = candidatesWithData[0];
    const statsPoints = firstCandidate.time_series_stats.stats_points;
    const labels = statsPoints.map((p: any) => p.date);

    const datasets = candidatesWithData.map(candidate => {
      const candidatePoints = candidate.time_series_stats?.stats_points || [];
      const candidateData = candidatePoints.map((point: any) => point.total_count || 0);

      return {
        label: candidate.name,
        data: candidateData,
        borderColor: candidate.color,
        backgroundColor: candidate.color + '20',
        tension: 0.3,
        fill: false,
        pointBackgroundColor: candidate.color,
        pointBorderColor: candidate.color,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });

    this.lineChartData = { labels: labels, datasets: datasets as any };
    this.updateChartOptionsForDataPoints(labels.length);
  }

  // 【黨主席版（學長）】recent_xxx_days_cumulative 結構
  private processCandidatesTimeSeriesDataChairman(): void {
    if (!this.candidates || this.candidates.length === 0) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    console.log('🔍 處理候選人時間序列數據:', this.candidates.length);

    const candidatesWithData = this.candidates.filter(c => c.time_series_stats && Object.keys(c.time_series_stats).length > 0);

    if (candidatesWithData.length === 0) {
      console.warn('沒有候選人有時間序列數據');
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    const keyMap: { [key: string]: string } = {
      'week': 'recent_7_days_cumulative',
      '2weeks': 'recent_14_days_cumulative',
      'month': 'recent_30_days_cumulative',
      '3months': 'recent_90_days_cumulative',
      '6months': 'recent_180_days_cumulative',
      '1year': 'recent_365_days_cumulative'
    };

    const targetKey = keyMap[this.currentFilter] || 'recent_365_days_cumulative';
    console.log('🔍 使用時間範圍鍵:', targetKey);

    const firstCandidate = candidatesWithData[0];
    const firstCandidateStats = firstCandidate.time_series_stats[targetKey];

    if (!firstCandidateStats || !firstCandidateStats.stats_points) {
      console.warn('沒有找到對應的時間序列數據:', targetKey);
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    const pointCount = firstCandidateStats.stats_points.length;
    const labels = this.generateTimeAxisLabels(pointCount, this.currentFilter);

    const datasets = this.candidates
      .filter(c => c.visible)
      .map(candidate => {
        const candidateStats = candidate.time_series_stats[targetKey];

        if (!candidateStats || !candidateStats.stats_points) {
          return {
            label: candidate.name,
            data: [],
            borderColor: candidate.color,
            backgroundColor: candidate.color + '20',
            tension: 0.3,
            fill: false
          };
        }

        const candidateData = candidateStats.stats_points.map((point: any) => {
          const sentiment = point.sentiment_counts || {};
          return (sentiment.positive || 0) + (sentiment.negative || 0);
        });

        return {
          label: candidate.name,
          data: candidateData,
          borderColor: candidate.color,
          backgroundColor: candidate.color + '20',
          tension: 0.3,
          fill: false,
          pointBackgroundColor: candidate.color,
          pointBorderColor: candidate.color,
          pointRadius: 4,
          pointHoverRadius: 6
        };
      });

    this.lineChartData = {
      labels: labels,
      datasets: datasets
    };

    this.updateChartOptionsForDataPoints(labels.length);

    console.log('🔍 總覽圖表數據更新:', {
      labelsCount: labels.length,
      datasetsCount: datasets.length,
      targetKey: targetKey
    });
  }

  // 根據數據點數量動態調整圖表選項
  private updateChartOptionsForDataPoints(dataPointCount: number): void {
    let maxTicksLimit: number;
    let autoSkip: boolean;
    let maxRotation: number;

    if (dataPointCount <= 7) {
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 0;
    } else if (dataPointCount <= 14) {
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 15;
    } else if (dataPointCount <= 30) {
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 30;
    } else if (dataPointCount <= 60) {
      maxTicksLimit = Math.min(dataPointCount, 25);
      autoSkip = true;
      maxRotation = 35;
    } else if (dataPointCount <= 90) {
      maxTicksLimit = Math.min(dataPointCount, 20);
      autoSkip = true;
      maxRotation = 40;
    } else {
      maxTicksLimit = Math.min(dataPointCount, 15);
      autoSkip = true;
      maxRotation = 45;
    }

    this.dynamicChartOptions.maxTicksLimit = maxTicksLimit;
    this.dynamicChartOptions.autoSkip = autoSkip;
    this.dynamicChartOptions.maxRotation = maxRotation;

    setTimeout(() => {
      if (this.lineChartComponent?.chart) {
        this.lineChartComponent.chart.update('none');
        this.lineChartComponent.chart.resize();
      }
    }, 100);
  }

  // 時間篩選方法（依模式分流）
  setQuickFilter(period: string): void {
    this.currentFilter = period;
    this.isLoadingTimeData = true;

    this.updateDateRangeForPeriod(period);

    const timeRangeMap: { [key: string]: string } = {
      'week': '7',
      '2weeks': '14',
      'month': '30',
      '3months': '90',
      '6months': '180',
      '1year': '365',
      'all': '365'
    };

    const timeRange = timeRangeMap[period] || '365';

    if (this.isLocalElection) {
      // 【地方選舉版】一律用主清單 API 重新載入；內部 updateCharts() 會依目前模式重畫
      this.loadElectionAnalysisData(timeRange);

      this.updateBarChart();
      this.updateUserCountChart();
    } else {
      // 【黨主席版（學長）】選了個人就只重載該候選人，否則重載全部
      if (this.selectedCandidateForTimeChart) {
        console.log('🔍 時間篩選：保持個人分析模式，重新載入候選人數據');
        this.loadCandidateTimeSeriesData(this.selectedCandidateForTimeChart);
      } else {
        console.log('🔍 時間篩選：總覽模式，重新載入所有候選人數據');
        this.loadElectionAnalysisData(timeRange);
      }

      this.updateBarChart();
    }

    setTimeout(() => {
      this.isLoadingTimeData = false;
    }, 500);
  }

  // 根據時間範圍更新日期範圍 - 使用選舉的 end_date
  private updateDateRangeForPeriod(period: string): void {
    if (!this.election || !this.election.end_date) {
      const today = new Date();
      this.endDate = today.toISOString().split('T')[0];
    } else {
      this.endDate = this.election.end_date;
    }

    const endDateObj = new Date(this.endDate);
    let startDate = new Date(endDateObj);

    switch (period) {
      case 'week':
        startDate.setDate(endDateObj.getDate() - 6);
        break;
      case '2weeks':
        startDate.setDate(endDateObj.getDate() - 13);
        break;
      case 'month':
        startDate.setDate(endDateObj.getDate() - 29);
        break;
      case '3months':
        startDate.setDate(endDateObj.getDate() - 89);
        break;
      case '6months':
        startDate.setDate(endDateObj.getDate() - 179);
        break;
      case '1year':
        startDate.setDate(endDateObj.getDate() - 364);
        break;
      case 'all':
        if (this.election && this.election.start_date) {
          startDate = new Date(this.election.start_date);
        } else {
          startDate.setDate(endDateObj.getDate() - 364);
        }
        break;
      default:
        startDate.setDate(endDateObj.getDate() - 364);
    }

    this.startDate = startDate.toISOString().split('T')[0];
  }

  // 動態計算顯示期間
  getDisplayPeriod(): string {
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }

    const days = this.calculateDaysDifference(this.startDate, this.endDate);

    return `${this.startDate} - ${this.endDate} (${days}天)`;
  }

  private calculateDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  // 根據數據點數量和時間範圍生成 X 軸時間標籤（兩邊邏輯相同，共用）
  private generateTimeAxisLabels(pointCount: number, filter: string): string[] {
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }

    let startDate: Date;
    let endDate: Date;

    if (this.startDate && this.endDate) {
      startDate = new Date(this.startDate);
      endDate = new Date(this.endDate);
    } else {
      if (this.election && this.election.end_date) {
        endDate = new Date(this.election.end_date);
      } else {
        endDate = new Date();
      }

      startDate = new Date(endDate);

      switch (filter) {
        case 'week':
          startDate.setDate(endDate.getDate() - 6);
          break;
        case '2weeks':
          startDate.setDate(endDate.getDate() - 13);
          break;
        case 'month':
          startDate.setDate(endDate.getDate() - 29);
          break;
        case '3months':
          startDate.setDate(endDate.getDate() - 89);
          break;
        case '6months':
          startDate.setDate(endDate.getDate() - 179);
          break;
        case '1year':
        case 'all':
          if (this.election && this.election.start_date) {
            startDate = new Date(this.election.start_date);
          } else {
            startDate.setDate(endDate.getDate() - 364);
          }
          break;
        default:
          startDate.setDate(endDate.getDate() - 29);
      }
    }

    const labels: string[] = [];
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const daysPerPoint = totalDays / pointCount;

    const fmt = (d: Date) => d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 每天一點的情境（week=7、2weeks=14、month=30）
    const dailyCountMap: { [key: string]: number } = { week: 7, '2weeks': 14, month: 30 };

    if (dailyCountMap[filter] !== undefined && pointCount === dailyCountMap[filter]) {
      for (let i = 0; i < pointCount; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        labels.push(fmt(date));
      }
    } else if ((filter === '1year' || filter === 'all') && pointCount === 12) {
      // 一年：12 點 = 每月一點
      for (let i = 0; i < pointCount; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        labels.push(fmt(date));
      }
    } else {
      // 其餘：按比例分配
      for (let i = 0; i < pointCount; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (i * daysPerPoint));
        labels.push(fmt(date));
      }
    }

    if (labels.length > 0) {
      labels[labels.length - 1] = fmt(endDate);
    }

    return labels;
  }
}