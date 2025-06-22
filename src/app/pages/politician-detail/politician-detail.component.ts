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

  // 標準英文情緒標籤
  private readonly STANDARD_EMOTIONS = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation'];
  
  // 中文情緒標籤到英文標籤的映射
  private readonly EMOTION_MAPPING: {[key: string]: string} = {
    '快樂': 'joy',
    '生氣': 'anger',
    '悲傷': 'sadness',
    '恐懼': 'fear',
    '驚訝': 'surprise',
    '厭惡': 'disgust',
    '信任': 'trust',
    '期待': 'anticipation'
  };

  // 正面情緒標籤
  private readonly POSITIVE_EMOTIONS = ['joy', 'trust', 'anticipation'];
  
  // 負面情緒標籤
  private readonly NEGATIVE_EMOTIONS = ['anger', 'sadness', 'fear', 'disgust'];
  
  // 中性情緒標籤 (可能正面或負面取決於上下文)
  private readonly NEUTRAL_EMOTIONS = ['surprise'];

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
          // 處理 legislators 集合的圖表數據 (包含文字雲和月份情感統計)
          this.processLegislatorsData(res);
          // 載入日期範圍 (用於時間篩選功能)
          this.loadDateRange();
          
          // 檢查 legislators 集合中的預計算數據
          const hasWordCloud = res.word_cloud && res.word_cloud.length > 0;
          const hasMonthlyStats = res.月份情感統計 && Object.keys(res.月份情感統計).length > 0;
          
          // 只有當缺少任何一項預計算數據時，才從 crawler_data 載入補充數據
          if (!hasWordCloud || !hasMonthlyStats) {
            // 只載入缺少的數據類型
            const chartTypes = [];
            if (!hasWordCloud) chartTypes.push('wordcloud');
            if (!hasMonthlyStats) chartTypes.push('timeseries'); 
            this.loadCrawlerData(chartTypes);
          }
        });
      }
    });
  }

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
    // 2. 情緒雷達圖 - 根據數據結構使用 positive/negative 分類
    if (data.情緒分析 && 
        (data.情緒分析.positive || data.情緒分析.negative)) {
      console.log('從 legislators 集合載入情緒雷達圖數據');
      this.updateEmotionRadarChart(data.情緒分析);
    }
    // 3. 文字雲 - 從 legislators 集合直接獲取
    if (data.word_cloud && data.word_cloud.length > 0) {
      // 確保數據格式正確 - text 和 weight 欄位
      this.demoWordCloudData = data.word_cloud.map((item: any) => ({
        text: item.text || item.word || '',
        weight: item.weight || item.count || 0
      })).filter((item: any) => item.text && item.weight > 0);
    }
    
    // 4. 月份情感統計 - 從 legislators 集合獲取並轉換為時間序列數據
    if (data.月份情感統計 && Object.keys(data.月份情感統計).length > 0) {
      this.updateTimeSeriesFromMonthlyStats(data.月份情感統計);
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

    // 顯示加載狀態
    this.isLoadingTimeData = true;

    // 根據是否指定時間範圍選擇API
    const apiCall = (startDate && endDate)
      ? this.dataService.getLegislatorTimeRangeData(this.politicianId, actualStartDate, actualEndDate)
      : this.dataService.getLegislatorTimeSeriesData(this.politicianId);

    apiCall.subscribe({
      next: (data) => {
        if (!data) {
          this.isLoadingTimeData = false;
          return;
        }
        this.updateSpecificCharts(data, chartTypes);
        this.isLoadingTimeData = false;
      },
      error: (error) => {
        this.isLoadingTimeData = false;
      }
    });
  }

  // 新方法：根據指定的圖表類型更新
  private updateSpecificCharts(data: any, chartTypes: string[]): void {
    if (!data) {
      return;
    }
    const shouldUpdateAll = chartTypes.includes('all');
    // 1. 詞雲
    if (shouldUpdateAll || chartTypes.includes('wordcloud')) {
      if (data.word_cloud && data.word_cloud.length > 0) {
        console.log('從 crawler_data 載入文字雲', data.word_cloud.length);
        // 確保數據格式正確
        this.demoWordCloudData = data.word_cloud.map((item: any) => ({
          text: item.text || item.word || '',
          weight: item.weight || item.count || 0
        })).filter((item: any) => item.text && item.weight > 0);
      } else {
        console.log('crawler_data 中沒有文字雲數據');
      }
    }

    // 2. 時間序列圖表
    if (shouldUpdateAll || chartTypes.includes('timeseries')) {
      if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
        this.demoLineChartData = data.time_series;
      } else {
        console.log('crawler_data 中沒有時間序列數據');
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

  // ===== 圖表更新方法 =====

  // 情緒雷達圖更新方法 - 處理 legislators 的 positive/negative 結構
  private updateEmotionRadarChart(emotionData: any): void {
    if (!emotionData) {
      console.log('沒有情緒分析數據');
      return;
    }

    // 檢查是否至少有一個情緒類別有數據
    const hasPositiveData = emotionData.positive && Object.keys(emotionData.positive).length > 0;
    const hasNegativeData = emotionData.negative && Object.keys(emotionData.negative).length > 0;
    
    if (!hasPositiveData && !hasNegativeData) {
      console.log('情緒分析數據為空');
      return;
    }

    // 初始化情緒數據
    const positiveEmotions = emotionData.positive || {};
    const negativeEmotions = emotionData.negative || {};

    // 根據你的數據結構: { positive: { anger: 561, joy: 128, ... }, negative: { anger: 1422, joy: 424, ... } }
    const positiveData = this.STANDARD_EMOTIONS.map(emotion => positiveEmotions[emotion] || 0);
    const negativeData = this.STANDARD_EMOTIONS.map(emotion => negativeEmotions[emotion] || 0);

    // 檢查是否有有效數據
    const allZeroes = [...positiveData, ...negativeData].every(val => val === 0);
    if (allZeroes) {
      console.log('所有情緒分析數據都為0');
      return;
    }

    // 計算動態範圍，避免點點擠在一起
    const allValues = [...positiveData, ...negativeData];
    const maxValue = Math.max(...allValues);
    let suggestedMax = Math.max(maxValue * 1.5, 50);
    if (maxValue < 10) suggestedMax = 100;

    // 更新雷達圖數據
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

    console.log('更新情緒雷達圖完成');
  }

  // 從月份情感統計生成時間序列數據
  private updateTimeSeriesFromMonthlyStats(monthlyStats: any): void {
    if (!monthlyStats || Object.keys(monthlyStats).length === 0) {
      console.log('沒有月份情感統計數據');
      return;
    }

    // 按日期排序月份
    const sortedMonths = Object.keys(monthlyStats).sort();
    
    // 準備時間序列數據
    const labels: string[] = [];
    const supportData: number[] = [];
    const opposeData: number[] = [];
    
    // 處理每個月份的數據
    sortedMonths.forEach(month => {
      const monthData = monthlyStats[month];
      
      // 確保月份格式正確 (YYYY-MM)
      if (!month.match(/^\d{4}-\d{2}$/)) {
        console.warn(`跳過格式不正確的月份: ${month}`);
        return;
      }
      
      // 只處理有數據的月份
      if (monthData) {
        // 支持罷免人數和反對罷免人數可能存在不同的鍵名
        const supportCount = monthData.支持罷免人數 || monthData.support_count || 0;
        const opposeCount = monthData.反對罷免人數 || monthData.oppose_count || 0;
        
        // 只添加有數據的月份
        if (supportCount > 0 || opposeCount > 0) {
          // 格式化標籤：從 YYYY-MM 轉換為 YYYY/MM 格式
          const [year, monthNum] = month.split('-');
          labels.push(`${year}/${monthNum}`);
          
          // 添加支持和反對數據
          supportData.push(supportCount);
          opposeData.push(opposeCount);
        }
      }
    });
    
    // 如果有數據，更新圖表
    if (labels.length > 0) {
      this.demoLineChartData = {
        labels: labels,
        datasets: [
          {
            label: '支持罷免',
            data: supportData,
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: '反對罷免',
            data: opposeData,
            borderColor: '#4f8cff',
            backgroundColor: 'rgba(79, 140, 255, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      };
    } else {
      console.log('沒有有效的月份數據');
    }
  }

  // 統一的情感圖表更新方法
  private updateSentimentChart(sentimentData: any): void {
    if (!sentimentData) {
      console.log('沒有情感分析數據');
      this.sentimentChartData = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
      this.positiveCount = 0;
      this.negativeCount = 0;
      return;
    }

    // 支持多種可能的數據格式
    // 格式1: { 反對罷免人數: X, 支持罷免人數: Y }
    // 格式2: { oppose_count: X, support_count: Y }
    this.positiveCount = 
      sentimentData.反對罷免人數 !== undefined ? sentimentData.反對罷免人數 : 
      sentimentData.oppose_count !== undefined ? sentimentData.oppose_count : 
      0;
      
    this.negativeCount = 
      sentimentData.支持罷免人數 !== undefined ? sentimentData.支持罷免人數 : 
      sentimentData.support_count !== undefined ? sentimentData.support_count : 
      0;

    // 如果數據為0，顯示一個提示
    const total = this.positiveCount + this.negativeCount;
    if (total === 0) {
      console.log('情感分析數據總數為0');
    } else {
      console.log(`情感分析數據: 反對=${this.positiveCount}, 支持=${this.negativeCount}`);
    }

    // 更新圖表數據
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
        // 顯示加載狀態
        this.isLoadingTimeData = true;
        // 直接從 crawler_data 載入數據
        this.loadCrawlerData(['all'], this.startDate, this.endDate);
        break;
      case 'month':
        startDate = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthStartDate = startDate.toISOString().split('T')[0];
        this.startDate = monthStartDate > this.minDate ? monthStartDate : this.minDate;
        this.endDate = this.maxDate;
        // 顯示加載狀態
        this.isLoadingTimeData = true;
        // 直接從 crawler_data 載入數據
        this.loadCrawlerData(['all'], this.startDate, this.endDate);
        break;
      case '3months':
        startDate = new Date(maxDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        const threeMonthsStartDate = startDate.toISOString().split('T')[0];
        this.startDate = threeMonthsStartDate > this.minDate ? threeMonthsStartDate : this.minDate;
        this.endDate = this.maxDate;
        // 顯示加載狀態
        this.isLoadingTimeData = true;
        // 直接從 crawler_data 載入數據
        this.loadCrawlerData(['all'], this.startDate, this.endDate);
        break;
      case 'all':
        // 全部時間：設定為完整時間範圍
        this.startDate = this.minDate;
        this.endDate = this.maxDate;
        
        // 顯示加載狀態
        this.isLoadingTimeData = true;
        
        // 檢查是否有預計算數據
        if (this.data && this.data.月份情感統計 && Object.keys(this.data.月份情感統計).length > 0) {
          console.log('使用 legislators 集合中的預計算數據');
          // 使用完整的月份情感統計數據
          this.updateTimeSeriesFromMonthlyStats(this.data.月份情感統計);
          
          // 更新圓餅圖
          if (this.data.情感分析) {
            this.updateSentimentChart(this.data.情感分析);
          }
          
          // 更新雷達圖
          if (this.data.情緒分析 && 
              (this.data.情緒分析.positive || this.data.情緒分析.negative)) {
            this.updateEmotionRadarChart(this.data.情緒分析);
          }
          
          // 完成後關閉加載狀態
          this.isLoadingTimeData = false;
        } else {
          // 如果沒有預計算數據，則從 crawler_data 載入
          this.loadCrawlerData(['all']);
        }
        break;
      default:
        startDate = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const defaultStartDate = startDate.toISOString().split('T')[0];
        this.startDate = defaultStartDate > this.minDate ? defaultStartDate : this.minDate;
        this.endDate = this.maxDate;
        // 顯示加載狀態
        this.isLoadingTimeData = true;
        // 直接從 crawler_data 載入數據
        this.loadCrawlerData(['all'], this.startDate, this.endDate);
    }
  }

  onDateRangeChange(): void {
    this.currentFilter = 'custom'; // 自定義日期時重置篩選狀態
    if (this.startDate && this.endDate && this.politicianId) {
      // 顯示加載狀態
      this.isLoadingTimeData = true;
      
      // 檢查是否是「全部時間」範圍 (startDate == minDate 且 endDate == maxDate)
      const isAllTimeRange = this.startDate === this.minDate && this.endDate === this.maxDate;
      
      if (isAllTimeRange && this.data && this.data.月份情感統計 && Object.keys(this.data.月份情感統計).length > 0) {
        // 全部時間範圍：使用 legislators 集合中的預計算數據
        console.log('使用 legislators 集合中的預計算數據');
        this.updateTimeSeriesFromMonthlyStats(this.data.月份情感統計);
        
        // 更新圓餅圖
        if (this.data.情感分析) {
          this.updateSentimentChart(this.data.情感分析);
        }
        
        // 更新雷達圖
        if (this.data.情緒分析 && 
            (this.data.情緒分析.positive || this.data.情緒分析.negative)) {
          this.updateEmotionRadarChart(this.data.情緒分析);
        }
        
        // 完成後關閉加載狀態
        this.isLoadingTimeData = false;
      } else {
        // 其他時間範圍：直接從 crawler_data 載入數據
        this.loadCrawlerData(['all'], this.startDate, this.endDate);
      }
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

  getDateRangeDays(): number {
    if (!this.startDate || !this.endDate) return 0;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private loadTimeRangeData(): void {
    this.isLoadingTimeData = true;

    // 驗證日期範圍
    if (!this.startDate || !this.endDate) {
      this.isLoadingTimeData = false;
      console.error('日期範圍無效');
      return;
    }

    console.log(`載入時間範圍數據: ${this.startDate} 至 ${this.endDate}`);
    
    // 檢查是否是「全部時間」範圍 (startDate == minDate 且 endDate == maxDate)
    const isAllTimeRange = this.startDate === this.minDate && this.endDate === this.maxDate;
    
    // 只有在「全部時間」且有預計算數據的情況下才使用 legislators 集合
    if (isAllTimeRange && this.data && this.data.月份情感統計 && 
        Object.keys(this.data.月份情感統計).length > 0) {
      console.log('使用 legislators 集合中的完整預計算數據');
      
      // 更新時間序列圖表 (使用完整的月份情感統計數據)
      this.updateTimeSeriesFromMonthlyStats(this.data.月份情感統計);
      
      // 更新圓餅圖
      if (this.data.情感分析) {
        this.updateSentimentChart(this.data.情感分析);
      }
      
      // 更新雷達圖
      if (this.data.情緒分析 && 
          (this.data.情緒分析.positive || this.data.情緒分析.negative)) {
        this.updateEmotionRadarChart(this.data.情緒分析);
      }
      
      this.isLoadingTimeData = false;
      return;
    }
    
    // 所有其他時間範圍都從 crawler_data 載入數據
    console.log('從 crawler_data 載入時間範圍數據');
    this.loadCrawlerData(['all'], this.startDate, this.endDate);
  }

  // 新增：更新時間範圍內的圓餅圖和雷達圖
  private updateTimeRangeCharts(data: any): void {
    if (!data) {
      console.error('時間範圍數據為空');
      return;
    }
    
    // 從時間範圍數據中提取情感和情緒分析
    if (data.sentiment_analysis) {
      // 更新情感分析圓餅圖
      this.updateSentimentChart(data.sentiment_analysis);
    }
    
    // 更新情緒雷達圖
    if (data.emotion_analysis_detailed) {
      const emotionData = {
        positive: data.emotion_analysis_detailed.positive || {},
        negative: data.emotion_analysis_detailed.negative || {}
      };
      this.updateEmotionRadarChart(emotionData);
    }
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
}