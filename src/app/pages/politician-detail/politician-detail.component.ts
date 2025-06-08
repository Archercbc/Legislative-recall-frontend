import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import {
  ButtonDirective,
} from '@coreui/angular';
import { IconModule } from '@coreui/icons-angular';

import { ChartjsComponent } from '@coreui/angular-chartjs';
import { Tooltip, type ChartData } from 'chart.js'; // 確保導入 ChartData 類型

@Component({
  selector: 'app-politician-detail',
  standalone: true, // 將組件標記為 standalone
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgChartsModule,
    ChartjsComponent,
    // CoreUI Components - 確保都正確導入
    ButtonDirective,
    IconModule
  ],
  templateUrl: './politician-detail.component.html',
  styleUrl: './politician-detail.component.scss'
})
export class PoliticianDetailComponent {
  politicianId = '';
  data: any = null;
  recallData: any = null;
  positiveCount = 0;
  negativeCount = 0;

  private readonly STANDARD_EMOTIONS = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation'];

  // 當前篩選狀態
  currentFilter: string = 'all';

  // 雷達圖數據 - 初始為空或通用標籤，實際數據從後端獲取
  radarChartData: ChartData<'radar'> = { // 使用 ChartData 類型
    labels: ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation'], // 預設或通用標籤，實際可能由後端提供
    datasets: []
  };

  education: string[] = [];
  experience: string[] = [];
  phone: string = '';
  address: string = '';

  // 圖表資料 - 初始為空
  sentimentChartData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [], backgroundColor: ['#4f8cff', '#f87171'] }] };
  
  // 折線圖資料 - 初始為空
  demoLineChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  // 詞雲資料 - 初始為空
  demoWordCloudData: { text: string, weight: number }[] = [];

  // 時間範圍篩選
  startDate: string = '';
  endDate: string = '';
  isLoadingTimeData: boolean = false;

  // 數據時間範圍限制
  minDate: string = '';
  maxDate: string = '';

  // 圓餅圖配置 - 美化 tooltip
  doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11
          }
        }
    }},
  };



  public lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    }

  public radarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
      duration: 0
    },
  elements: {
    point: {
      radius: 6,
      hoverRadius: 8
    }
  } 
  }   

  constructor(private route: ActivatedRoute, private dataService: DataService) {
    this.initializeDateRange();

    this.route.paramMap.subscribe(params => {
      this.politicianId = params.get('politicianId') || '';
      if (this.politicianId) {
        this.dataService.getLegislatorDetail(this.politicianId).subscribe(res => {
          this.data = res
          // recall 罷免資料
          this.dataService.getRecallList().subscribe(recallList => {
            this.recallData = recallList.find(r => r["姓名"] === this.data.name);
          });
          // 處理 legislators 集合的圖表數據
          this.processLegislatorsData(res);
          // 載入完整的 crawler_data 數據（詞雲 + 時間序列）
          this.loadCrawlerData(['wordcloud', 'timeseries']);
          // 載入日期範圍
          this.loadDateRange();
        });
      }
    });
  }



 
  // 移除不再使用的方法

  private loadDateRange(): void {
    this.dataService.getLegislatorDateRange(this.politicianId).subscribe({
      next: (dateRangeData) => {
        // 設定日期範圍限制和初始值
        if (dateRangeData && dateRangeData.start_date && dateRangeData.end_date) {
          this.minDate = dateRangeData.start_date;
          this.maxDate = dateRangeData.end_date;

          // 設定初始日期範圍為全部時間（從最早到最晚）
          this.startDate = this.minDate;
          this.endDate = this.maxDate;
        }
      },
      error: (error) => {
        console.error('❌ 載入日期範圍失敗:', error);
      }
    });
  }

  // ===== 主要方法 =====

  // 主要方法1：處理 legislators 集合數據
  private processLegislatorsData(data: any): void {
    // 1. 情感分析圓餅圖
    if (data.情感分析) {
      this.updateSentimentChart(data.情感分析);
    }
    // 2. 情緒雷達圖 - 根據你的數據結構，使用 positive/negative 分類
    if (data.情緒分析 && data.情緒分析.positive && data.情緒分析.negative) {
      this.updateEmotionRadarChart(data.情緒分析);
    }
  }
  // 重新設計：統一的數據載入方法
  private loadCrawlerData(
    chartTypes: string[] = ['all'],
    startDate?: string,
    endDate?: string
  ): void {
    // 使用實際的日期範圍或預設範圍
    const actualStartDate = startDate || this.minDate;
    const actualEndDate = endDate || this.maxDate;


    // 根據是否指定時間範圍選擇API
    const apiCall = (startDate && endDate)
      ? this.dataService.getLegislatorTimeRangeData(this.politicianId, actualStartDate, actualEndDate)
      : this.dataService.getLegislatorTimeSeriesData(this.politicianId);

    apiCall.subscribe({
      next: (data) => {
        this.updateSpecificCharts(data, chartTypes);
      },
      error: (error) => {
        console.error('❌ 載入 crawler_data 失敗:', error);
      }
    });
  }

  // 新方法：根據指定的圖表類型更新
  private updateSpecificCharts(data: any, chartTypes: string[]): void {
    const shouldUpdateAll = chartTypes.includes('all');

    // 1. 詞雲
    if (shouldUpdateAll || chartTypes.includes('wordcloud')) {
      if (data.word_cloud && data.word_cloud.length > 0) {
        this.demoWordCloudData = data.word_cloud;
      }
    }

    // 2. 時間序列圖表
    if (shouldUpdateAll || chartTypes.includes('timeseries')) {
      if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
        this.demoLineChartData = data.time_series;
      }
    }

    // 3. 圓餅圖和雷達圖（從 crawler_data 重新計算）
    if (shouldUpdateAll || chartTypes.includes('sentiment') || chartTypes.includes('emotion')) {
      this.updateChartsFromCrawlerData(data);
    }
  }

  // 新方法：從 crawler_data 重新計算圓餅圖和雷達圖
  private updateChartsFromCrawlerData(data: any): void {

    // 按照 before.ts 的正確邏輯處理數據

    // 1. 更新圓餅圖（使用 sentiment_analysis）
    if (data.sentiment_analysis) {
      const sentiment = data.sentiment_analysis;
      this.negativeCount = sentiment.support_count || 0;  // NEGATIVE = 支持罷免
      this.positiveCount = sentiment.oppose_count || 0;   // POSITIVE = 反對罷免

      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [this.positiveCount, this.negativeCount],
          backgroundColor: ['#4f8cff', '#f87171']  // 藍色=反對，紅色=支持
        }]
      };

    }

    // 2. 更新雷達圖（使用 emotion_analysis_detailed，按照 before.ts 邏輯）
    if (data.emotion_analysis_detailed &&
        (Object.keys(data.emotion_analysis_detailed.positive || {}).length > 0 ||
         Object.keys(data.emotion_analysis_detailed.negative || {}).length > 0)) {

      const positiveEmotions = data.emotion_analysis_detailed.positive || {};
      const negativeEmotions = data.emotion_analysis_detailed.negative || {};

      // 定義標準的8大情緒
      const standardEmotions = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation'];

      // 根據情感標籤分類的情緒數據，只使用標準情緒
      const positiveData = standardEmotions.map(emotion => positiveEmotions[emotion] || 0);
      const negativeData = standardEmotions.map(emotion => negativeEmotions[emotion] || 0);

      // 更新雷達圖數據
      this.radarChartData = {
        labels: standardEmotions,
        datasets: [
          {
            label: '反對罷免情緒',
            data: positiveData,
            backgroundColor: 'rgba(79, 140, 255, 0.2)',
            borderColor: '#4f8cff',
            pointBackgroundColor: '#4f8cff',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#4f8cff',
            borderWidth: 2
          },
          {
            label: '支持罷免情緒',
            data: negativeData,
            backgroundColor: 'rgba(248, 113, 113, 0.2)',
            borderColor: '#f87171',
            pointBackgroundColor: '#f87171',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#f87171',
            borderWidth: 2
          }
        ]
      };
    }
  }

  // 更新來自 crawler_data 的圖表
  private updateCrawlerDataCharts(data: any): void {
    // 1. 詞雲
    if (data.word_cloud && data.word_cloud.length > 0) {
      this.demoWordCloudData = data.word_cloud;
    }
    // 2. 時間序列圖表
    if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
      this.demoLineChartData = data.time_series;
    } else {
      // 設定示例時間序列
      this.demoLineChartData = {
        labels: ['2024-01', '2024-02', '2024-03'],
        datasets: [
          {
            label: '支持罷免',
            data: [20, 25, 30],
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: '反對罷免',
            data: [80, 75, 70],
            borderColor: '#4f8cff',
            backgroundColor: 'rgba(79, 140, 255, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      };
    }
  }

  // ===== 圖表更新方法 =====

  // 情緒雷達圖更新方法 - 處理 legislators 的 positive/negative 結構
  private updateEmotionRadarChart(emotionData: any): void {
    if (!emotionData || !emotionData.positive || !emotionData.negative) {
      return;
    }

    // 根據你的數據結構: { positive: { anger: 561, joy: 128, ... }, negative: { anger: 1422, joy: 424, ... } }
    const positiveData = this.STANDARD_EMOTIONS.map(emotion => emotionData.positive[emotion] || 0);
    const negativeData = this.STANDARD_EMOTIONS.map(emotion => emotionData.negative[emotion] || 0);

    // 計算動態範圍，避免點點擠在一起
    const allValues = [...positiveData, ...negativeData];
    const maxValue = Math.max(...allValues);
    let suggestedMax = Math.max(maxValue * 1.5, 50);
    if (maxValue < 10) suggestedMax = 100;



    this.radarChartData = {
      labels: this.STANDARD_EMOTIONS,
      datasets: [
        {
          label: '反對罷免情緒',
          data: positiveData,
          backgroundColor: 'rgba(79, 140, 255, 0.2)',
          borderColor: '#4f8cff',
          pointBackgroundColor: '#4f8cff',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#4f8cff',
          borderWidth: 2
        },
        {
          label: '支持罷免情緒',
          data: negativeData,
          backgroundColor: 'rgba(248, 113, 113, 0.2)',
          borderColor: '#f87171',
          pointBackgroundColor: '#f87171',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#f87171',
          borderWidth: 2
        }
      ]
    };

  }

  // 移除不再使用的方法

  // 統一的情感圖表更新方法
  private updateSentimentChart(sentimentData: any): void {
    if (!sentimentData) {
      this.sentimentChartData = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
      this.positiveCount = 0;
      this.negativeCount = 0;
      return;
    }

    this.positiveCount = sentimentData.反對罷免人數 || sentimentData.oppose_count || 0;
    this.negativeCount = sentimentData.支持罷免人數 || sentimentData.support_count || 0;

    this.sentimentChartData = {
      labels: ['反對罷免', '支持罷免'],
      datasets: [{
        data: [this.positiveCount, this.negativeCount],
        backgroundColor: ['#4f8cff', '#f87171']
      }]
    };
  }


  get party(): string {
    if (!this.data?.constituency) return '';
    const found = this.data.constituency.find((c: string) => c.startsWith('黨籍：'));
    return found ? found.split('：')[1] : '';
  }
  get district(): string {
    if (!this.data?.constituency) return '';
    const found = this.data.constituency.find((c: string) => c.startsWith('選區：'));
    return found ? found.split('：')[1] : '';
  }
  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getColor(word: string): string {
    const colors = ['#4f8cff', '#ff41f8', '#ffb347', '#6ee7b7', '#f87171'];
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // 修正百分比計算 - POSITIVE=反對，NEGATIVE=支持
  getSupportPercentage(): string {
    const total = this.positiveCount + this.negativeCount;
    if (total === 0) return '0.0';
    return ((this.negativeCount / total) * 100).toFixed(1);  // NEGATIVE = 支持
  }

  getOpposePercentage(): string {
    const total = this.positiveCount + this.negativeCount;
    if (total === 0) return '0.0';
    return ((this.positiveCount / total) * 100).toFixed(1);  // POSITIVE = 反對
  }



  // 處理中文屬性訪問的方法
  getUserCount(): string {
    if (!this.data) return '0';
    const userCount = this.data['用戶數'] || 0;
    return userCount.toLocaleString();
  }

  getCommentCount(): string {
    if (!this.data) return '0';
    const commentCount = this.data['留言數'] || 0;
    return commentCount.toLocaleString();
  }

  // 獲取總用戶數（支持+反對）
  getTotalUsers(): string {
    const total = this.positiveCount + this.negativeCount;
    return total.toLocaleString();
  }

  // 時間範圍相關方法 - 初始化為空，等待從API載入實際範圍
  initializeDateRange(): void {
    // 不設定初始日期，等待從 date-range API 載入實際的最早和最晚日期
    this.startDate = '';
    this.endDate = '';
  }

  setQuickFilter(period: string): void {
    this.currentFilter = period; // 記錄當前篩選狀態
    // 使用實際的數據日期範圍，而不是今天的日期
    if (!this.maxDate) {
      return;
    }

    const maxDate = new Date(this.maxDate);
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekStartDate = startDate.toISOString().split('T')[0];
        this.startDate = weekStartDate > this.minDate ? weekStartDate : this.minDate;
        this.endDate = this.maxDate;
        this.onDateRangeChange();
        break;
      case 'month':
        startDate = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthStartDate = startDate.toISOString().split('T')[0];
        this.startDate = monthStartDate > this.minDate ? monthStartDate : this.minDate;
        this.endDate = this.maxDate;
        this.onDateRangeChange();
        break;
      case '3months':
        startDate = new Date(maxDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        const threeMonthsStartDate = startDate.toISOString().split('T')[0];
        this.startDate = threeMonthsStartDate > this.minDate ? threeMonthsStartDate : this.minDate;
        this.endDate = this.maxDate;
        this.onDateRangeChange();
        break;
      case 'all':
        // 全部時間：重新載入完整的 crawler_data
        this.startDate = this.minDate;
        this.endDate = this.maxDate;
        this.loadCrawlerData(['all']);
        break;
      default:
        startDate = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const defaultStartDate = startDate.toISOString().split('T')[0];
        this.startDate = defaultStartDate > this.minDate ? defaultStartDate : this.minDate;
        this.endDate = this.maxDate;
        this.onDateRangeChange();
    }
  }

  onDateRangeChange(): void {
    this.currentFilter = 'custom'; // 自定義日期時重置篩選狀態
    if (this.startDate && this.endDate && this.politicianId) {
      this.loadTimeRangeData();
    }
  }

  // 格式化日期範圍顯示
  formatDateRange(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };

    return `${start.toLocaleDateString('zh-TW', formatOptions)} ~ ${end.toLocaleDateString('zh-TW', formatOptions)}`;
  }

  // 移除重複的方法

  getDateRangeDays(): number {
    if (!this.startDate || !this.endDate) return 0;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // 移除重複的方法定義，使用現有的 loadInitialTimeSeriesData 方法

  private loadTimeRangeData(): void {
    this.isLoadingTimeData = true;

    // 驗證日期範圍
    if (!this.startDate || !this.endDate) {
      this.isLoadingTimeData = false;
      return;
    }

    // 使用新的統一方法載入所有圖表
    this.loadCrawlerData(['all'], this.startDate, this.endDate);
    this.isLoadingTimeData = false;
  }

  // 新增：更新時間範圍內的圓餅圖和雷達圖
  private updateTimeRangeCharts(data: any): void {
    // 從時間範圍數據中提取情感和情緒分析
    const emotionDetailed = data.emotion_analysis_detailed || { positive: {}, negative: {} };

    // 計算情感分析數據（支持/反對罷免）
    const totalRecords = data.total_records || 0;
    const supportCount = Math.floor(totalRecords * 0.4); // 假設40%支持罷免
    const opposeCount = totalRecords - supportCount;

    // 更新圓餅圖
    this.sentimentChartData = {
      labels: ['反對罷免', '支持罷免'],
      datasets: [{
        data: [opposeCount, supportCount],
        backgroundColor: ['#4f8cff', '#f87171'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    // 同時更新計數器
    this.positiveCount = opposeCount;
    this.negativeCount = supportCount;

    // 更新雷達圖
    this.updateEmotionRadarChart({ 情緒分析: emotionDetailed });
  }

  // CoreUI 相關的輔助方法
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    });
  }

  getWordBadgeColor(index: number): string {
    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
    return colors[index % colors.length];
  }

  getWordSize(weight: number): number {
    // 根據權重計算字體大小 (12-20px)
    const minSize = 12;
    const maxSize = 20;
    const maxWeight = Math.max(...this.demoWordCloudData.map(w => w.weight || 1)); // 處理沒有 weight 的情況
    if (maxWeight === 0) return minSize; // 避免除以零
    const ratio = weight / maxWeight;
    return Math.round(minSize + (maxSize - minSize) * ratio);
  }

  // 文字雲專用的大小計算（更大的範圍，出現次數多的在中間且更大）
  getWordCloudSize(weight: number, index: number): number {
    if (!this.demoWordCloudData.length) return 14;

    const maxWeight = Math.max(...this.demoWordCloudData.map(w => w.weight || 1));
    const minWeight = Math.min(...this.demoWordCloudData.map(w => w.weight || 1));

    if (maxWeight === minWeight) return 18;

    // 根據權重計算大小 (14-32px)
    const minSize = 14;
    const maxSize = 32;
    const ratio = (weight - minWeight) / (maxWeight - minWeight);

    // 前幾個（權重高的）詞語更大
    const sizeBonus = index < 3 ? 4 : index < 6 ? 2 : 0;

    return Math.round(minSize + (maxSize - minSize) * ratio) + sizeBonus;
  }

  // 文字雲專用的顏色計算
  getWordCloudColor(_word: string, index: number): string {
    const colors = [
      '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c',
      '#0891b2', '#be185d', '#4338ca', '#16a34a', '#c2410c'
    ];

    // 前幾個重要詞語使用更鮮明的顏色
    if (index < 5) {
      return colors[index % 5];
    }

    // 其他詞語使用較淡的顏色
    const lightColors = ['#6b7280', '#9ca3af', '#64748b', '#71717a', '#78716c'];
    return lightColors[index % lightColors.length];
  }

  // 移除罷免狀態相關方法，這些應該在台灣地圖頁面
}