import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
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
  // 視圖狀態：'map' (第一層) | 'city' (第二層) | 'candidate' (第三層)
  currentView: 'map' | 'city' | 'candidate' = 'map';
  selectedCounty: string | null = null;
  selectedCountyName: string = '';
  selectedCandidate: any = null; // 第三層選中的候選人
  
  // 修正 viewBox：X=180, Y=20, 寬=420, 高=700，讓台灣垂直水平完整居中填滿
 // 直接改成更大範圍試試看：
  viewBox="-30 0 850 800"

  // 台灣主要縣市清單（對齊 SVG 地圖 ID）
  // 縣市列表（初始化時由 allMayoralCandidates 動態算出人數）
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
  // 1. 保留一份全量候選人母體（暫時作為本地測試，之後直接接 API）
  allMayoralCandidates: any[] = [
    // 台北市
    { id: 'chiang-wan-an', name: '蔣萬安', party: '國民黨', city: 'taipei-city', photo: '/assets/candidates/蔣萬安.jpg', color: '#000080', status: 'incumbent', positive: 18507, negative: 42925, visible: true },
    { id: 'pua-shen-po', name: '沈伯洋', party: '民進黨', city: 'taipei-city', photo: '/assets/candidates/沈伯洋.jpg', color: '#1b9431', status: 'potential', positive: 21824, negative: 2768, visible: true },
    { id: 'kuo-hsi', name: '郭璽', party: '台灣麻將最大黨', city: 'taipei-city', photo: '/assets/candidates/郭璽.jpg', color: '#ea580c', status: 'announced', positive: 5400, negative: 8200, visible: true },
    { id: 'hsiao-wen-chien', name: '蕭文乾', party: '台灣SoR無法黨', city: 'taipei-city', photo: '/assets/candidates/蕭文乾.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 新北市
    { id: 'lee-sichuan', name: '李四川', party: '國民黨', city: 'new-taipei-city', photo: '/assets/candidates/李四川.jpg', color: '#000080', status: 'announced', positive: 12450, negative: 3200, visible: true },
    { id: 'su-chiao-hui', name: '蘇巧慧', party: '民進黨', city: 'new-taipei-city', photo: '/assets/candidates/蘇巧慧.jpg', color: '#1b9431', status: 'announced', positive: 15320, negative: 4100, visible: true },

    // 基隆市
    { id: 'tong-zi-wei', name: '童子瑋', party: '民進黨', city: 'keelung-city', photo: '/assets/candidates/童子瑋.jpg', color: '#1b9431', status: 'announced', positive: 8520, negative: 3100, visible: true },
    { id: 'hsieh-kuo-liang', name: '謝國樑', party: '國民黨', city: 'keelung-city', photo: '/assets/candidates/謝國樑.jpg', color: '#000080', status: 'incumbent', positive: 11200, negative: 14500, visible: true },

    // 桃園市
    { id: 'huang-shi-jie', name: '黃世杰', party: '民進黨', city: 'taoyuan-city', photo: '/assets/candidates/黃世杰.jpg', color: '#1b9431', status: 'potential', positive: 9400, negative: 4200, visible: true },
    { id: 'chang-shan-cheng', name: '張善政', party: '國民黨', city: 'taoyuan-city', photo: '/assets/candidates/張善政.jpg', color: '#000080', status: 'incumbent', positive: 16800, negative: 8900, visible: true },

    // 新竹縣
    { id: 'zheng-chao-fang', name: '鄭朝方', party: '民進黨', city: 'hsinchu-county', photo: '/assets/candidates/鄭朝方.jpg', color: '#1b9431', status: 'announced', positive: 8800, negative: 3600, visible: true },
    { id: 'hsu-hsin-ying', name: '徐欣瑩', party: '國民黨', city: 'hsinchu-county', photo: '/assets/candidates/徐欣瑩.jpg', color: '#000080', status: 'announced', positive: 10400, negative: 6500, visible: true },
    { id: 'chu-ting-yu', name: '朱定瑀', party: '無黨籍', city: 'hsinchu-county', photo: '/assets/candidates/朱定瑀.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 新竹市
    { id: 'zhuang-jing-cheng', name: '莊競程', party: '民進黨', city: 'hsinchu-city', photo: '/assets/candidates/莊競程.jpg', color: '#1b9431', status: 'potential', positive: 7600, negative: 2900, visible: true },
    { id: 'kao-hung-an', name: '高虹安', party: '無黨籍', city: 'hsinchu-city', photo: '/assets/candidates/高虹安.jpg', color: '#fcfefe', status: 'incumbent', positive: 13500, negative: 18200, visible: true },
    { id: 'ho-chih-yung', name: '何志勇', party: '無黨籍', city: 'hsinchu-city', photo: '/assets/candidates/何志勇.jpg', color: '#64748b', status: 'potential', positive: 5100, negative: 3100, visible: true },
    { id: 'lee-chen-hsiu', name: '李貞秀', party: '無黨籍', city: 'hsinchu-city', photo: '/assets/candidates/李貞秀.jpg', color: '#fcfefe', status: 'announced', positive: 5100, negative: 3100, visible: true },
    
    // 苗栗縣
    { id: 'chen-pin-an', name: '陳品安', party: '無黨籍', city: 'miaoli-county', photo: '/assets/candidates/陳品安.jpg', color: '#64748b', status: 'potential', positive: 6400, negative: 2100, visible: true },
    { id: 'chung-tung-chin', name: '鍾東錦', party: '國民黨', city: 'miaoli-county', photo: '/assets/candidates/鍾東錦.jpg', color: '#000080', status: 'incumbent', positive: 14200, negative: 7800, visible: true },

    // 台中市
    { id: 'ho-hsin-chun', name: '何欣純', party: '民進黨', city: 'taichung-city', photo: '/assets/candidates/何欣純.jpg', color: '#1b9431', status: 'announced', positive: 16200, negative: 8100, visible: true },
    { id: 'chiang-chi-chen', name: '江啟臣', party: '國民黨', city: 'taichung-city', photo: '/assets/candidates/江啟臣.jpg', color: '#000080', status: 'announced', positive: 19800, negative: 7200, visible: true },
    { id: 'hung-li-hua', name: '洪麗華', party: '司法改革黨', city: 'taichung-city', photo: '/assets/candidates/洪麗華.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 彰化縣
    { id: 'chen-su-yueh', name: '陳素月', party: '民進黨', city: 'changhua-county', photo: '/assets/candidates/陳素月.jpg', color: '#1b9431', status: 'announced', positive: 8100, negative: 3900, visible: true },
    { id: 'wei-ping-cheng', name: '魏平政', party: '國民黨', city: 'changhua-county', photo: '/assets/candidates/魏平政.jpg', color: '#000080', status: 'announced', positive: 6900, negative: 5200, visible: true },
    { id: 'chiu-chien-fu', name: '邱建富', party: '無黨籍', city: 'changhua-county', photo: '/assets/candidates/邱建富.jpg', color: '#64748b', status: 'announced', positive: 4500, negative: 6800, visible: true },
    { id: 'chen-chung-chia', name: '陳重嘉', party: '無黨籍', city: 'changhua-county', photo: '/assets/candidates/陳重嘉.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 南投縣
    { id: 'wen-shih-cheng', name: '温世政', party: '民進黨', city: 'nantou-county', photo: '/assets/candidates/温世政.jpg', color: '#1b9431', status: 'announced', positive: 4800, negative: 1900, visible: true },
    { id: 'hsu-shu-hua', name: '許淑華', party: '國民黨', city: 'nantou-county', photo: '/assets/candidates/許淑華.jpg', color: '#000080', status: 'incumbent', positive: 15400, negative: 6700, visible: true },

    // 雲林縣
    { id: 'liu-chien-kuo', name: '劉建國', party: '民進黨', city: 'yunlin-county', photo: '/assets/candidates/劉建國.jpg', color: '#1b9431', status: 'announced', positive: 9100, negative: 5300, visible: true },
    { id: 'chang-chia-chun', name: '張嘉郡', party: '國民黨', city: 'yunlin-county', photo: '/assets/candidates/張嘉郡.jpg', color: '#000080', status: 'announced', positive: 12100, negative: 5800, visible: true },
    { id: 'wu-ping-hui', name: '吳炳輝', party: '無黨籍', city: 'yunlin-county', photo: '/assets/candidates/吳炳輝.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 嘉義縣
    { id: 'tsai-yi-yu', name: '蔡易餘', party: '民進黨', city: 'chiayi-county', photo: '/assets/candidates/蔡易餘.jpg', color: '#1b9431', status: 'announced', positive: 11500, negative: 4600, visible: true },
    { id: 'wu-pin-jui', name: '吳品叡', party: '無黨籍', city: 'chiayi-county', photo: '/assets/candidates/吳品叡.jpg', color: '#64748b', status: 'announced', positive: 7200, negative: 2300, visible: true },

    // 嘉義市
    { id: 'wang-mei-hui', name: '王美惠', party: '民進黨', city: 'chiayi-city', photo: '/assets/candidates/王美惠.jpg', color: '#1b9431', status: 'announced', positive: 13200, negative: 3800, visible: true },
    { id: 'chang-chi-kai', name: '張啓楷', party: '民眾黨', city: 'chiayi-city', photo: '/assets/candidates/張啓楷.jpg', color: '#28c8c8', status: 'announced', positive: 9800, negative: 6200, visible: true },
    { id: 'huang-hong-cheng', name: '黃宏成台灣阿成世界偉人財神總統', party: '無黨籍', city: 'chiayi-city', photo: '/assets/candidates/黃宏成台灣阿成世界偉人財神總統.jpg', color: '#64748b', status: 'announced', positive: 0, negative: 0, visible: true },
    { id: 'chen-kai-huang', name: '陳愷璜', party: '無黨籍', city: 'chiayi-city', photo: '/assets/candidates/陳愷璜.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 台南市
    { id: 'chen-ting-fei', name: '陳亭妃', party: '民進黨', city: 'tainan-city', photo: '/assets/candidates/陳亭妃.jpg', color: '#1b9431', status: 'announced', positive: 17400, negative: 6500, visible: true },
    { id: 'hsieh-lung-chieh', name: '謝龍介', party: '國民黨', city: 'tainan-city', photo: '/assets/candidates/謝龍介.jpg', color: '#000080', status: 'announced', positive: 16100, negative: 8200, visible: true },
    { id: 'yeh-jen-wen', name: '葉人文', party: '無黨籍', city: 'tainan-city', photo: '/assets/candidates/葉人文.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'hsiao-lin-hung', name: '蕭燐洪', party: '台灣SoR無法黨', city: 'tainan-city', photo: '/assets/candidates/蕭燐洪.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 高雄市
    { id: 'lai-jui-lung', name: '賴瑞隆', party: '民進黨', city: 'kaohsiung-city', photo: '/assets/candidates/賴瑞隆.jpg', color: '#1b9431', status: 'announced', positive: 15600, negative: 9100, visible: true },
    { id: 'ko-chih-en', name: '柯志恩', party: '國民黨', city: 'kaohsiung-city', photo: '/assets/candidates/柯志恩.jpg', color: '#000080', status: 'announced', positive: 18200, negative: 8400, visible: true },
    { id: 'chang-ching', name: '張靜', party: '司法改革黨', city: 'kaohsiung-city', photo: '/assets/candidates/張靜.jpg', color: '#64748b', status: 'announced', positive: 3100, negative: 1800, visible: true },
    { id: 'wang-chao-min', name: '王肇民', party: '無黨籍', city: 'kaohsiung-city', photo: '/assets/candidates/王肇民.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 屏東縣
    { id: 'chou-chun-mi', name: '周春米', party: '民進黨', city: 'pingtung-county', photo: '/assets/candidates/周春米.jpg', color: '#1b9431', status: 'incumbent', positive: 13900, negative: 5200, visible: true },
    { id: 'su-ching-chuan', name: '蘇清泉', party: '國民黨', city: 'pingtung-county', photo: '/assets/candidates/蘇清泉.jpg', color: '#000080', status: 'announced', positive: 10800, negative: 7900, visible: true },

    // 宜蘭縣
    { id: 'lin-kuo-chang', name: '林國漳', party: '民進黨', city: 'yilan-county', photo: '/assets/candidates/林國漳.jpg', color: '#1b9431', status: 'potential', positive: 7200, negative: 2400, visible: true },
    { id: 'wu-tsung-hsien', name: '吳宗憲', party: '國民黨', city: 'yilan-county', photo: '/assets/candidates/吳宗憲.jpg', color: '#000080', status: 'announced', positive: 9100, negative: 4300, visible: true },
    { id: 'chen-wan-hui', name: '陳琬惠', party: '民眾黨', city: 'yilan-county', photo: '/assets/candidates/陳琬惠.jpg', color: '#28c8c8', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chen-hung-yi', name: '陳宏毅', party: '無黨籍', city: 'yilan-county', photo: '/assets/candidates/陳宏毅.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'liu-tsan-hui', name: '劉燦輝', party: '無黨籍', city: 'yilan-county', photo: '/assets/candidates/劉燦輝.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 花蓮縣
    { id: 'yu-shu-chen', name: '游淑貞', party: '國民黨', city: 'hualien-county', photo: '/assets/candidates/游淑貞.jpg', color: '#000080', status: 'announced', positive: 8400, negative: 5100, visible: true },
    { id: 'chang-chun', name: '張峻', party: '無黨籍', city: 'hualien-county', photo: '/assets/candidates/張峻.jpg', color: '#64748b', status: 'announced', positive: 7900, negative: 4600, visible: true },
    { id: 'wei-chia-hsien', name: '魏嘉賢', party: '無黨籍', city: 'hualien-county', photo: '/assets/candidates/魏嘉賢.jpg', color: '#64748b', status: 'announced', positive: 6800, negative: 3200, visible: true },
    { id: 'lo-pei-chin', name: '羅佩秦', party: '無黨籍', city: 'hualien-county', photo: '/assets/candidates/羅佩秦.jpg', color: '#64748b', status: 'announced', positive: 3200, negative: 1500, visible: true },

    // 台東縣
    { id: 'chen-ying', name: '陳瑩', party: '民進黨', city: 'taitung-county', photo: '/assets/candidates/陳瑩.jpg', color: '#1b9431', status: 'announced', positive: 7500, negative: 3400, visible: true },
    { id: 'wu-hsiu-hua', name: '吳秀華', party: '國民黨', city: 'taitung-county', photo: '/assets/candidates/吳秀華.jpg', color: '#000080', status: 'announced', positive: 8900, negative: 4100, visible: true },
    { id: 'liu-chao-hao', name: '劉櫂豪', party: '無黨籍', city: 'taitung-county', photo: '/assets/candidates/劉櫂豪.jpg', color: '#64748b', status: 'announced', positive: 5100, negative: 3800, visible: true },
    { id: 'li-wu-ying-chih', name: '李吳穎智', party: '無黨籍', city: 'taitung-county', photo: '/assets/candidates/李吳穎智.jpg', color: '#64748b', status: 'potential', positive: 2100, negative: 1200, visible: true },

    // 澎湖縣
    { id: 'wu-shu-chin', name: '吳淑瑾', party: '民進黨', city: 'penghu-county', photo: '/assets/candidates/吳淑瑾.jpg', color: '#1b9431', status: 'potential', positive: 5400, negative: 2600, visible: true },
    { id: 'chen-chen-chung', name: '陳振中', party: '國民黨', city: 'penghu-county', photo: '/assets/candidates/陳振中.jpg', color: '#000080', status: 'announced', positive: 6100, negative: 2900, visible: true },
    { id: 'yeh-chu-lin', name: '葉竹林', party: '無黨籍', city: 'penghu-county', photo: '/assets/candidates/葉竹林.jpg', color: '#64748b', status: 'announced', positive: 4200, negative: 2100, visible: true },
    { id: 'chou-ni-an', name: '周倪安', party: '台灣團結聯盟', city: 'penghu-county', photo: '/assets/candidates/周倪安.jpg', color: '#c89600', status: 'announced', positive: 2600, negative: 1900, visible: true },
    { id: 'chen-chin-chuan', name: '陳盡川', party: '無黨籍', city: 'penghu-county', photo: '/assets/candidates/陳盡川.jpg', color: '#64748b', status: 'potential', positive: 1800, negative: 900, visible: true },
    { id: 'hsu-chih-fu', name: '許智富', party: '無黨籍', city: 'penghu-county', photo: '/assets/candidates/許智富.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 金門縣
    { id: 'chen-yu-chen', name: '陳玉珍', party: '國民黨', city: 'kinmen-county', photo: '/assets/candidates/陳玉珍.jpg', color: '#000080', status: 'announced', positive: 9800, negative: 8100, visible: true },
    { id: 'lee-wen-liang', name: '李文良', party: '無黨籍', city: 'kinmen-county', photo: '/assets/candidates/李文良.jpg', color: '#64748b', status: 'potential', positive: 5300, negative: 2100, visible: true },
    { id: 'hung-ho-cheng', name: '洪和成', party: '無黨籍', city: 'kinmen-county', photo: '/assets/candidates/洪和成.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'huang-shih-tuan', name: '黃世團', party: '無黨籍', city: 'kinmen-county', photo: '/assets/candidates/黃世團.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'chang-kuo-wei', name: '張國威', party: '無黨籍', city: 'kinmen-county', photo: '/assets/candidates/張國威.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },
    { id: 'liang-wen-tao', name: '梁文韜', party: '無黨籍', city: 'kinmen-county', photo: '/assets/candidates/梁文韜.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true },

    // 連江縣
    { id: 'wang-chung-ming', name: '王忠銘', party: '國民黨', city: 'lienchiang-county', photo: '/assets/candidates/王忠銘.jpg', color: '#000080', status: 'incumbent', positive: 3900, negative: 1200, visible: true },
    { id: 'tsao-erh-yuan', name: '曹爾元', party: '無黨籍', city: 'lienchiang-county', photo: '/assets/candidates/曹爾元.jpg', color: '#64748b', status: 'potential', positive: 0, negative: 0, visible: true }
  ];

  // 2. 點選縣市時，同步過濾左側候選人清單
  onCountyClick(countyId: string, countyName?: string): void {
    this.selectedCounty = countyId;

    if (this.isLocalElection) {
      this.filterCandidatesByCounty(countyId);
    }
  }

  // 3. 縣市過濾方法
  filterCandidatesByCounty(countyId: string): void {
    // 篩選出屬於該縣市的候選人
    this.candidates = this.allMayoralCandidates.filter(c => c.city === countyId);
    
    // 同步更新頂部的 KPI 數字
    this.totalCandidates = this.candidates.length;
  }
  

  taiwanMap = taiwan;
  // 依據縣市 ID 動態取得該縣市候選人數量
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

  getCountyColor(countyId: string): string {
  return this.selectedCounty === countyId ? '#38bdf8' : '#334155';
  }
  // 判斷是否為地方/縣市長選舉（依你的 electionId 或 type 判斷）
  get isLocalElection(): boolean {
    return this.electionId ? (this.electionId.includes('local') || this.electionId.includes('2026')) : false;
  }
  // 取得三向態度數據（支持、反對/支持他人、中立）
  getCandidateSentimentBreakdown(candidate: any) {
    if (!candidate) {
      return { support: 0, oppose: 0, neutral: 0, total: 0, supportPct: 0, opposePct: 0, neutralPct: 0 };
    }

    const support = candidate.support ?? candidate.positive ?? 0;
    const oppose = candidate.oppose ?? candidate.negative ?? 0;
    // 若無獨立中立數據，預設以支持與反對總和的 18% 推估中立討論量
    const neutral = candidate.neutral ?? Math.round((support + oppose) * 0.18);
    const total = support + oppose + neutral;

    const supportPct = total > 0 ? Math.round((support / total) * 1000) / 10 : 0;
    const opposePct = total > 0 ? Math.round((oppose / total) * 1000) / 10 : 0;
    const neutralPct = total > 0 ? Math.round((100 - supportPct - opposePct) * 10) / 10 : 0;

    return {
      support,
      oppose,
      neutral,
      total,
      supportPct,
      opposePct,
      neutralPct
    };
  }
 // 【進入第二層：縣市戰情室】
  enterCityBattle(countyId: string, countyName?: string): void {
    this.selectedCounty = countyId;
    const found = this.countyList.find(c => c.id === countyId);
    this.selectedCountyName = countyName || (found ? found.name : countyId);
    this.currentView = 'city';
    this.candidates = this.allMayoralCandidates.filter(c => c.city === countyId);
    this.totalCandidates = this.candidates.length;
    this.selectedCandidate = null;
  }

  // 【進入第三層：候選人個人深度分析】
  enterCandidateDetail(candidate: any): void {
    this.selectedCandidate = candidate;
    this.currentView = 'candidate';
    // 連動原本底部的時間趨勢折線圖
    if (candidate && candidate.id) {
      this.selectCandidateForTimeChart(candidate.id);
    }
  }
  // 【返回第一層：全台大地圖】
  backToFullMap(): void {
    this.currentView = 'map';
    this.selectedCounty = '';
    this.selectedCountyName = '';
    this.selectedCandidate = null;
  }

  // 【返回第二層：縣市戰情室】
  backToCity(): void {
    this.currentView = 'city';
    this.selectedCandidate = null;
  }
  
  // 選舉相關屬性
  electionId: string = '';
  election: any = null;
  electionData: any = null;
  
  // 候選人數據
  candidates: any[] = [];
  selectedCandidates: string[] = [];
  
  // 圖表數據
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  
  // 時間圖表模式控制
  selectedCandidateForTimeChart: string | null = null; // null = 顯示所有候選人總網友數
  
  // 時間篩選相關屬性 - 參考立委頁面
  currentFilter: string = '1year';
  isLoadingTimeData: boolean = false;
  
  // 日期範圍相關屬性
  startDate: string = '';
  endDate: string = '';
  
  // 後端數據相關屬性
  timeSeriesStats: any = null;
  
  // 動態圖表選項配置（用於 updateChartOptionsForDataPoints）
  private dynamicChartOptions: any = {
    maxTicksLimit: 20,
    autoSkip: false,
    maxRotation: 45
  };
  
  // 圖表選項 - 動態調整標籤顯示
  get lineChartOptions(): any {
    const component = this; // 保存組件引用
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
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
          // 移除 position、xAlign、yAlign，讓 positioner 完全控制位置
          filter: (tooltipItem: any) => {
            // 只顯示有效的數據點
            return tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined;
          },
          // 自定義位置函數：預設顯示在滑鼠右側
          positioner: (elements: any[], eventPosition: any) => {
            const tooltip = elements[0];
            if (!tooltip || !tooltip.chart) {
              return false;
            }
            
            const chart = tooltip.chart;
            const chartCanvas = chart.canvas;
            const chartRect = chartCanvas.getBoundingClientRect();
            const chartArea = chart.chartArea;
            
            // 獲取 tooltip 實際尺寸
            const tooltipWidth = tooltip.width || 280;
            const tooltipHeight = tooltip.height || 180;
            
            // 計算相對於畫布的絕對位置
            const canvasX = chartRect.left + eventPosition.x;
            const canvasY = chartRect.top + eventPosition.y;
            
            // 獲取視窗尺寸
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 定位邏輯：簡化並確保在最右側時能正確顯示
            const offsetX = 15; // 與數據點的間距
            const margin = 30; // 視窗邊距（增加以確保可見性）
            
            // 垂直位置：tooltip 垂直居中對齊數據點
            let tooltipY = canvasY - tooltipHeight / 2;
            let tooltipX;
            
            // 計算右側可用空間（從數據點到視窗右邊界）
            const rightSpaceAvailable = viewportWidth - canvasX - margin;
            
            // 決定顯示在左側還是右側
            if (rightSpaceAvailable >= tooltipWidth + offsetX) {
              // 右側有足夠空間，顯示在右側
              tooltipX = canvasX + offsetX;
            } else {
              // 右側空間不足，強制顯示在左側
              tooltipX = canvasX - tooltipWidth - offsetX;
              
              // 如果左側也不夠（數據點太靠左），確保 tooltip 至少在視窗內
              if (tooltipX < margin) {
                // 左側空間不足，將 tooltip 緊貼左邊界
                tooltipX = margin;
              }
            }
            
            // 最終安全檢查：確保 tooltip 完全在視窗內
            // 檢查右邊界
            if (tooltipX + tooltipWidth > viewportWidth - margin) {
              tooltipX = viewportWidth - tooltipWidth - margin;
            }
            
            // 檢查左邊界
            if (tooltipX < margin) {
              tooltipX = margin;
            }
            
            // 垂直位置調整：確保 tooltip 在視窗內，但優先保持與數據點對齊
            if (tooltipY < 20) {
              // 上方超出視窗，向下調整到視窗頂部
              tooltipY = 20;
            } else if (tooltipY + tooltipHeight > viewportHeight - 20) {
              // 下方超出視窗，向上調整
              tooltipY = viewportHeight - tooltipHeight - 20;
              // 如果調整後仍然超出，至少確保頂部可見
              if (tooltipY < 20) {
                tooltipY = 20;
              }
            }
            
            // 轉換回相對於圖表的座標（Chart.js 期望相對於畫布的座標）
            const relativeX = tooltipX - chartRect.left;
            const relativeY = tooltipY - chartRect.top;
            
            return {
              x: relativeX,
              y: relativeY
            };
          },
          callbacks: {
            title: (tooltipItems: any[]) => {
              // 顯示日期作為標題
              if (tooltipItems && tooltipItems.length > 0) {
                const label = tooltipItems[0].label;
                return `日期：${label}`;
              }
              return '';
            },
            label: (context: any) => {
              // 自定義標籤顯示
              const dataset = context.dataset;
              const value = context.parsed.y;
              const label = dataset.label || '未知';
              
              // 格式化數值（添加千分位）
              const formattedValue = value.toLocaleString('zh-TW');
              
              // 如果是個人分析模式，顯示正負面數據
              if (component.selectedCandidateForTimeChart && dataset.label) {
                // 檢查是否有正負面數據
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
              
              // 總覽模式：顯示「候選人名字 - 累計評論總網友數」
              return `${label} - 累計評論總網友數: ${formattedValue}`;
            },
            afterLabel: (context: any) => {
              // 在標籤後添加額外資訊
              if (!component.selectedCandidateForTimeChart) {
                // 總覽模式：顯示排名資訊（計算所有候選人在該時間點的值）
                const allDatasets = context.chart.data.datasets;
                const dataIndex = context.dataIndex;
                const allValues = allDatasets
                  .map((ds: any) => ds.data[dataIndex])
                  .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
                const currentValue = context.parsed.y;
                
                if (allValues.length > 1) {
                  // 計算排名（值越大排名越前）
                  const sortedValues = [...allValues].sort((a: number, b: number) => b - a);
                  const rank = sortedValues.indexOf(currentValue) + 1;
                  return `排名：第 ${rank} 名 / ${allValues.length} 位候選人`;
                }
              }
              return '';
            },
            labelColor: (context: any) => {
              // 使用數據集的顏色作為 tooltip 顏色指示器
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
            // 格式化 Y 軸數值
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
          text: '網友數',
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

  // 控制選項 - 簡化為核心功能
  selectedTimeRange: string = '30_days';
  availableIntervals: string[] = [];
  timeRanges = [
    { value: '7_days', label: '近7天' },
    { value: '30_days', label: '近30天' },
    { value: '90_days', label: '近90天' },
    { value: '365_days', label: '近一年' }
  ];

  // 移除圖表類型篩選，直接顯示兩種圖表

  // 狀態
  isLoading = false;
  totalCandidates = 0;
  totalSentiment = 0;
  averageSentiment = 0;

  // 顏色配置
  colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private electionService: ElectionService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.electionId = params['id'];
      if (this.taiwanMap && (this.taiwanMap as any).viewBox) {
      this.viewBox = (this.taiwanMap as any).viewBox;
      }
      if (this.electionId) {
        // 如果是縣市長選舉，預設選取台北市
        if (this.isLocalElection) {
          this.selectedCounty = 'taipei';
          this.filterCandidatesByCounty('taipei');
        }
        this.loadElectionData();
      } else {
        // 如果沒有ID，重定向到選舉列表
        this.router.navigate(['/election-analysis']);
      }
    });
  }

  loadElectionData(): void {
    this.isLoading = true;
    
    // 直接使用前端配置數據
    const electionConfig = getElectionById(this.electionId);
    if (electionConfig) {
      this.election = electionConfig;
      this.electionData = electionConfig;
      
      // 初始化候選人數據
      this.candidates = electionConfig.candidates.map((candidate: any, index: number) => ({
        ...candidate,
        visible: true,
        color: this.colors[index % this.colors.length]
      }));

      this.totalCandidates = electionConfig.candidates.length;
      this.selectedCandidates = this.candidates.map(c => c.id);

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

  // 載入選舉分析數據 - 傳遞候選人名單
  private loadElectionAnalysisData(days: string = '365'): void {
    // 從選舉配置中獲取候選人名單
    const candidateNames = this.election.candidates.map((c: any) => c.name);
    this.electionService.getElectionAnalysisData(candidateNames, days).subscribe({
      next: (data) => {
        // 合併後端分析數據和前端配置的候選人信息
        this.candidates = data.candidates.map((candidate: any, index: number) => {
          // 從前端配置中找到對應的候選人信息
          const configCandidate = this.election.candidates.find((c: any) => c.name === candidate.name);
          return {
            ...candidate,  // 後端分析數據
            ...configCandidate,  // 前端配置信息（包括 photo, party, partyColor）
            visible: true,
            color: this.colors[index % this.colors.length]
          };
        });

        // 暫時註解原本吃 API 的寫法
// this.totalCandidates = data.statistics.total_candidates;
// this.totalSentiment = data.statistics.total_sentiment;
// this.averageSentiment = data.statistics.average_sentiment;

// 🟢 改成使用本地全量名單計算：
this.totalCandidates = this.allMayoralCandidates.length;

this.totalSentiment = this.allMayoralCandidates.reduce(
  (sum, c) => sum + (c.positive || 0) + (c.negative || 0), 
  0
);

this.averageSentiment = this.totalCandidates > 0 
  ? Math.round(this.totalSentiment / this.totalCandidates) 
  : 0;
        // 載入時間序列數據 - 直接使用候選人的數據
        this.timeSeriesStats = this.buildTimeSeriesStatsFromCandidates();
        
        console.log('🔍 選舉分析數據載入:', {
          hasTimeSeriesStats: !!this.timeSeriesStats,
          timeSeriesStatsKeys: this.timeSeriesStats ? Object.keys(this.timeSeriesStats) : [],
          candidatesCount: this.candidates.length
        });
        
        // 初始化可用時間間隔
        this.availableIntervals = ['7_days', '14_days', '30_days', '90_days', '180_days', '365_days'];
        
        // 直接處理候選人時間序列數據
        this.processCandidatesTimeSeriesData();
        
        this.updateBarChart();
        
        // 強制圖表重新渲染
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
  }

  updateLineChart(): void {
    const visibleCandidates = this.candidates.filter(c => c.visible);
    
    if (visibleCandidates.length === 0) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    if (this.selectedCandidateForTimeChart) {
      // 顯示特定候選人的正負面網友數時間圖 - 使用真實數據
      const candidate = visibleCandidates.find(c => c.id === this.selectedCandidateForTimeChart);
      if (candidate && candidate.time_series_stats) {
        // 使用動態生成的 X 軸標籤（與立委頁面邏輯一致）
        const originalData = candidate.time_series_stats;
        const pointCount = originalData.labels ? originalData.labels.length : 0;
        const labels = this.generateTimeAxisLabels(pointCount, this.currentFilter);
        
        // 處理數據集，確保正負面數據被正確傳遞
        const processedDatasets = (originalData.datasets || []).map((dataset: any) => {
          // 如果數據集有正負面數據，確保它們被正確傳遞
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
        
        // 如果數據集有兩條線（支持/反對），合併正負面數據
        if (processedDatasets.length >= 2) {
          const supportDataset = processedDatasets.find((ds: any) => ds.label === '支持' || ds.label === '正面');
          const opposeDataset = processedDatasets.find((ds: any) => ds.label === '反對' || ds.label === '負面');
          
          if (supportDataset && opposeDataset) {
            // 為兩個數據集添加正負面數據引用
            supportDataset.positiveData = supportDataset.data;
            supportDataset.negativeData = opposeDataset.data;
            opposeDataset.positiveData = supportDataset.data;
            opposeDataset.negativeData = opposeDataset.data;
          }
        }
        
        // 創建新的圖表數據，使用動態生成的標籤
        this.lineChartData = {
          labels: labels,
          datasets: processedDatasets
        };
        
        // 為個人分析也動態調整圖表選項
        this.updateChartOptionsForDataPoints(labels.length);
      } else {
        this.lineChartData = { labels: [], datasets: [] };
      }
    } else {
      // 顯示所有候選人的總網友數時間圖 - 使用真實數據
      this.processCandidatesTimeSeriesData();
    }
  }

  updateBarChart(): void {
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



  // 處理後端回傳的 time_series 數據 - 合併兩條線為總網友數（累計趨勢）
  private processTimeSeriesData(timeSeriesData: any): void {
    if (!timeSeriesData.labels || !timeSeriesData.datasets || timeSeriesData.datasets.length < 2) {
      console.warn('時間序列數據格式不正確');
      return;
    }

    const labels = timeSeriesData.labels;
    const negativeData = timeSeriesData.datasets[0].data; // 負面網友數（累計）
    const positiveData = timeSeriesData.datasets[1].data; // 正面網友數（累計）

    // 計算總網友數（正負面網友數相加）- 都是累計數據，只會上漲或持平
    const totalData = [];
    for (let i = 0; i < labels.length; i++) {
      totalData.push((negativeData[i] || 0) + (positiveData[i] || 0));
    }

    // 創建合併後的數據集（累計趨勢）
    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          label: '累計評論總網友數',
          data: totalData,  // 累計總網友數，只會上漲或持平
          positiveData: positiveData,  // 累計正面網友數
          negativeData: negativeData,  // 累計負面網友數
          candidateName: '累計評論總網友數',
          borderColor: '#0d9488',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true
        } as any  // 使用 any 類型避免 TypeScript 錯誤
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

  // 點擊候選人切換時間圖表模式
  selectCandidateForTimeChart(candidateId: string | null): void {
    this.selectedCandidateForTimeChart = candidateId;
    
    // 如果選擇了特定候選人，載入該候選人的詳細時間序列數據
    if (candidateId) {
      this.loadCandidateTimeSeriesData(candidateId);
    } else {
      // 如果取消選擇，更新圖表顯示所有候選人
      this.updateLineChart();
    }
  }

  // 返回總覽 - 優化的UI/UX方法
  returnToOverview(): void {
    console.log('🔍 返回總覽：重新載入整體數據');
    
    // 清除個人分析選擇
    this.selectedCandidateForTimeChart = null;
    
    // 重新載入整體數據以確保數據是最新的
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
    
    // 顯示載入狀態
    this.isLoadingTimeData = true;
    
    // 重新載入所有候選人的數據
    this.loadElectionAnalysisData(timeRange);
    
    // 模擬載入時間
    setTimeout(() => {
      this.isLoadingTimeData = false;
    }, 500);
  }

  onTimeRangeChange(): void {
    if (!this.timeSeriesStats) {
      return;
    }

    // 映射前端時間範圍到後端參數
    const timeRangeMap: { [key: string]: string } = {
      '7_days': '7',
      '14_days': '14',
      '30_days': '30',
      '90_days': '90',
      '180_days': '180',
      '365_days': '365'
    };
    
    const timeRange = timeRangeMap[this.selectedTimeRange] || '365';
    
    // 重新載入數據
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

  updateCharts(): void {
    this.updateLineChart();
    this.updateBarChart();
  }

  getSupportPercentage(candidate: any): string {
    const positive = candidate.positive ?? 0;
    const negative = candidate.negative ?? 0;
    const total = positive + negative;
    
    if (total === 0) return '0.0';
    
    return ((positive / total) * 100).toFixed(1);
  }

 goBack(): void {
  if (this.currentView === 'candidate') {
    // 1. 第三層（個人戰情室）-> 返回第二層（縣市戰情室）
    this.currentView = 'city';
    this.selectedCandidate = null;

  } else if (this.currentView === 'city') {
    // 2. 第二層（縣市戰情室）-> 返回第一層（2026 縣市長選舉全台地圖）
    this.currentView = 'map';
    this.selectedCounty = null;
    this.selectedCountyName = '';
    this.selectedCandidate = null;

  } else {
    // 3. 第一層 -> 返回「選舉分析中心」入口頁
    this.router.navigate(['/election-analysis']); 
    // 💡 備註：如果你的路由是 '/election'，就改填 ['/election']
  }
}

  // 加上重設全台 KPI 的函式
  resetTotalKpis(): void {
    if (this.allMayoralCandidates && this.allMayoralCandidates.length > 0) {
      this.totalCandidates = this.allMayoralCandidates.length;
      this.totalSentiment = this.allMayoralCandidates.reduce(
        (sum, c) => sum + (c.positive || 0) + (c.negative || 0),
        0
      );
      this.averageSentiment = this.totalCandidates > 0
        ? Math.round(this.totalSentiment / this.totalCandidates)
        : 0;
    }
  }

  // 載入特定候選人的時間序列數據 - 參考政治人物頁面實現
  private loadCandidateTimeSeriesData(candidateId: string): void {
    const candidate = this.candidates.find(c => c.id === candidateId);
    if (!candidate) {
      console.error('找不到候選人:', candidateId);
      return;
    }

    // 顯示載入狀態
    this.isLoadingTimeData = true;

    // 獲取當前時間範圍的天數
    const days = this.getDaysFromTimeRange();
    
    console.log('🔍 載入候選人個人數據:', {
      candidateName: candidate.name,
      days: days,
      currentFilter: this.currentFilter
    });
    
    // 調用後端 API 獲取該候選人的詳細時間序列數據
    this.electionService.getCandidateTimeSeriesData(candidate.name, days).subscribe({
      next: (data) => {
        console.log('🔍 候選人時間序列數據載入:', candidate.name, data);
        
        if (data && data.time_series) {
          // 更新候選人的時間序列數據
          candidate.time_series_stats = data.time_series;
          
          // 更新圖表
          this.updateLineChart();
        } else {
          console.warn('候選人時間序列數據為空:', candidate.name);
          // 如果沒有數據，顯示空圖表
          this.lineChartData = { labels: [], datasets: [] };
        }
        
        this.isLoadingTimeData = false;
      },
      error: (error) => {
        console.error('載入候選人時間序列數據失敗:', error);
        // 出錯時顯示空圖表
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

    // 檢查第一個候選人是否有時間序列數據
    const firstCandidate = this.candidates[0];
    if (!firstCandidate.time_series_stats) {
      return null;
    }

    // 返回第一個候選人的時間序列數據結構用於兼容性
    return firstCandidate.time_series_stats;
  }

  // 直接處理候選人的時間序列數據 - 使用真實後端數據
  private processCandidatesTimeSeriesData(): void {
    if (!this.candidates || this.candidates.length === 0) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    console.log('🔍 處理候選人時間序列數據:', this.candidates.length);

    // 檢查是否有候選人有時間序列數據（使用正確的數據結構）
    const candidatesWithData = this.candidates.filter(c => c.time_series_stats && Object.keys(c.time_series_stats).length > 0);
    
    if (candidatesWithData.length === 0) {
      console.warn('沒有候選人有時間序列數據');
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    // 根據當前篩選器選擇對應的數據鍵
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

    // 使用第一個有數據的候選人作為基礎
    const firstCandidate = candidatesWithData[0];
    const firstCandidateStats = firstCandidate.time_series_stats[targetKey];
    
    if (!firstCandidateStats || !firstCandidateStats.stats_points) {
      console.warn('沒有找到對應的時間序列數據:', targetKey);
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

    // 使用動態生成的 X 軸標籤（與立委頁面邏輯一致）
    const pointCount = firstCandidateStats.stats_points.length;
    const labels = this.generateTimeAxisLabels(pointCount, this.currentFilter);

    // 為每個可見的候選人創建數據集
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

        // 提取候選人的累計數據
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

    // 根據數據點數量動態調整圖表選項
    this.updateChartOptionsForDataPoints(labels.length);

    console.log('🔍 總覽圖表數據更新:', {
      labelsCount: labels.length,
      datasetsCount: datasets.length,
      targetKey: targetKey
    });
  }

  // 根據數據點數量動態調整圖表選項 - 優化以避免滾動條
  private updateChartOptionsForDataPoints(dataPointCount: number): void {
    // 根據數據點數量和容器寬度智能調整 X 軸標籤顯示策略
    // 目標：避免產生滾動條，同時保持可讀性
    
    let maxTicksLimit: number;
    let autoSkip: boolean;
    let maxRotation: number;

    // 根據數據點數量智能調整
    if (dataPointCount <= 7) {
      // 7天內：顯示所有標籤，不旋轉
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 0;
    } else if (dataPointCount <= 14) {
      // 14天內：顯示所有標籤，輕微旋轉
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 15;
    } else if (dataPointCount <= 30) {
      // 30天內：顯示所有標籤，適度旋轉
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 30;
    } else if (dataPointCount <= 60) {
      // 60天內：智能顯示標籤，適度旋轉
      // 根據容器寬度估算：假設每個標籤需要約 80px（含旋轉）
      maxTicksLimit = Math.min(dataPointCount, 25);
      autoSkip = true; // 啟用自動跳過，避免重疊
      maxRotation = 35;
    } else if (dataPointCount <= 90) {
      // 90天內：顯示關鍵標籤
      maxTicksLimit = Math.min(dataPointCount, 20);
      autoSkip = true;
      maxRotation = 40;
    } else {
      // 超過90天：顯示關鍵時間點標籤
      // 計算合理的標籤數量，確保不會產生滾動條
      maxTicksLimit = Math.min(dataPointCount, 15);
      autoSkip = true;
      maxRotation = 45;
    }

    // 更新動態圖表選項
    this.dynamicChartOptions.maxTicksLimit = maxTicksLimit;
    this.dynamicChartOptions.autoSkip = autoSkip;
    this.dynamicChartOptions.maxRotation = maxRotation;

    // 強制圖表更新，確保響應式調整
    setTimeout(() => {
      if (this.lineChartComponent?.chart) {
        this.lineChartComponent.chart.update('none'); // 使用 'none' 模式避免動畫
        // 確保圖表適應容器大小
        this.lineChartComponent.chart.resize();
      }
    }, 100);

    console.log('🔍 圖表選項更新（無滾動條優化）:', {
      dataPointCount,
      maxTicksLimit,
      autoSkip,
      maxRotation
    });
  }


  // 時間篩選方法 - 保持當前選擇狀態
  setQuickFilter(period: string): void {
    this.currentFilter = period;
    this.isLoadingTimeData = true;
    
    // 更新日期範圍
    this.updateDateRangeForPeriod(period);
    
    // 映射前端篩選器到後端時間範圍參數
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
    
    if (this.selectedCandidateForTimeChart) {
      // 如果當前選擇了特定候選人，只重新載入該候選人的數據
      console.log('🔍 時間篩選：保持個人分析模式，重新載入候選人數據');
      this.loadCandidateTimeSeriesData(this.selectedCandidateForTimeChart);
    } else {
      // 如果沒有選擇特定候選人，重新載入所有候選人的數據
      console.log('🔍 時間篩選：總覽模式，重新載入所有候選人數據');
      this.loadElectionAnalysisData(timeRange);
    }
    
    // 更新長條圖（確保與時間篩選連結）
    this.updateBarChart();
    
    // 模擬載入時間
    setTimeout(() => {
      this.isLoadingTimeData = false;
    }, 500);
  }

  // 根據時間範圍更新日期範圍 - 使用選舉的 end_date
  private updateDateRangeForPeriod(period: string): void {
    if (!this.election || !this.election.end_date) {
      // 如果沒有選舉配置或結束日期，使用今天作為結束日期
      const today = new Date();
      this.endDate = today.toISOString().split('T')[0];
    } else {
      this.endDate = this.election.end_date;
    }
    
    const endDateObj = new Date(this.endDate);
    let startDate = new Date(endDateObj);
    
    switch (period) {
      case 'week':
        startDate.setDate(endDateObj.getDate() - 6); // 包含結束日，所以減6天
        break;
      case '2weeks':
        startDate.setDate(endDateObj.getDate() - 13); // 包含結束日，所以減13天
        break;
      case 'month':
        startDate.setDate(endDateObj.getDate() - 29); // 包含結束日，所以減29天
        break;
      case '3months':
        startDate.setDate(endDateObj.getDate() - 89); // 包含結束日，所以減89天
        break;
      case '6months':
        startDate.setDate(endDateObj.getDate() - 179); // 包含結束日，所以減179天
        break;
      case '1year':
        startDate.setDate(endDateObj.getDate() - 364); // 包含結束日，所以減364天
        break;
      case 'all':
        // 如果有 start_date，使用它；否則從結束日往前推一年
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

  // 新增方法：動態計算顯示期間（基於 currentFilter 和選舉的 end_date）
  getDisplayPeriod(): string {
    // 確保日期範圍已更新
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }
    
    const days = this.calculateDaysDifference(this.startDate, this.endDate);
    
    return `${this.startDate} - ${this.endDate} (${days}天)`;
  }

  // 計算兩個日期之間的天數差異
  private calculateDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // 新增方法：根據數據點數量和時間範圍生成 X 軸時間標籤（與立委頁面邏輯一致）
  private generateTimeAxisLabels(pointCount: number, filter: string): string[] {
    // 確保日期範圍已設置
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }
    
    // 如果還是沒有日期範圍，使用選舉配置的日期
    let startDate: Date;
    let endDate: Date;
    
    if (this.startDate && this.endDate) {
      startDate = new Date(this.startDate);
      endDate = new Date(this.endDate);
    } else {
      // 備用方案：使用選舉配置的日期
      if (this.election && this.election.end_date) {
        endDate = new Date(this.election.end_date);
      } else {
        endDate = new Date();
      }
      
      startDate = new Date(endDate);
      
      // 根據時間範圍計算開始日期
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
    
    // 根據開始日期、結束日期和數據點數量生成標籤
    // 計算每個點代表的時間間隔
    const daysPerPoint = totalDays / pointCount;
    
    // 根據時間範圍決定生成策略
    switch (filter) {
      case 'week':
        // 最近一周：7個點 = 每天一點
        if (pointCount === 7) {
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        } else {
          // 如果點數不是7，按比例分配
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (i * daysPerPoint));
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        }
        break;
        
      case '2weeks':
        // 最近兩周：14個點 = 每天一點
        if (pointCount === 14) {
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        } else {
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (i * daysPerPoint));
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        }
        break;
        
      case 'month':
        // 最近一個月：30個點 = 每天一點
        if (pointCount === 30) {
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        } else {
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (i * daysPerPoint));
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        }
        break;
        
      case '3months':
        // 最近三個月：按比例分配
        for (let i = 0; i < pointCount; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (i * daysPerPoint));
          labels.push(date.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }));
        }
        break;
        
      case '6months':
        // 最近六個月：按比例分配
        for (let i = 0; i < pointCount; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (i * daysPerPoint));
          labels.push(date.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }));
        }
        break;
        
      case '1year':
      case 'all':
        // 最近一年：12個點 = 每個月一點
        if (pointCount === 12) {
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        } else {
          // 如果點數不是12，按比例分配（每個點代表的天數）
          for (let i = 0; i < pointCount; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (i * daysPerPoint));
            labels.push(date.toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }));
          }
        }
        break;
        
      default:
        // 預設：按比例分配
        for (let i = 0; i < pointCount; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (i * daysPerPoint));
          labels.push(date.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }));
        }
    }
    
    // 確保最後一個標籤是結束日期
    if (labels.length > 0) {
      labels[labels.length - 1] = endDate.toLocaleDateString('zh-TW', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
    
    return labels;
  }
}
