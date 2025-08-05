import { Component } from '@angular/core';
import {  Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';

import { IconModule } from '@coreui/icons-angular';

import { ChartjsComponent } from '@coreui/angular-chartjs';
import { Tooltip, type ChartData } from 'chart.js'; // 確保導入 ChartData 類型
import { TagCloudComponent, CloudData, CloudOptions } from 'angular-tag-cloud-module';

@Component({
  selector: 'app-politician-detail',
  standalone: true, // 將組件標記為 standalone
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgChartsModule,
    ChartjsComponent,
    TagCloudComponent,
    // CoreUI Components - 確保都正確導入
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

  // 文字雲相關屬性
  wordCloudData: CloudData[] = [];
  wordCloudOptions: CloudOptions = {
    width: 600,
    height: 400,
    overflow: false,
    zoomOnHover: { scale: 1.2, transitionTime: 0.3, delay: 0.1 },
    realignOnResize: true,
    randomizeAngle: true
  };
  isLoadingWordCloud = false;

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

  // 詞雲資料 - 初始為空 (已移至文字雲相關屬性中)

  // 時間範圍篩選
  startDate: string = '';
  endDate: string = '';
  isLoadingTimeData: boolean = false;

  // 數據時間範圍限制
  minDate: string = '';
  maxDate: string = '';
  oneYearAgoDate: string = '';  // 新增一年前日期

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
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'nearest' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 14
        },
        callbacks: {
          title: function(context: any) {
            return context[0].label || '';
          },          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}累計: ${value} 人`;
          }
        },
        external: function(context: any) {
          // 當沒有活動元素時，強制隱藏 tooltip
          if (!context.tooltip.dataPoints || context.tooltip.dataPoints.length === 0) {
            const tooltipEl = document.getElementById('chartjs-tooltip');
            if (tooltipEl) {
              tooltipEl.style.opacity = '0';
              tooltipEl.style.visibility = 'hidden';
            }
          }
        }
      },
      legend: {
        display: true,
        position: 'top' as const
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '時間'
        }
      },      y: {
        display: true,
        title: {
          display: true,
          text: '累計人數'
        }
      }
    },
    onHover: (event: any, activeElements: any, chart: any) => {
      // 當沒有活動元素時（滑鼠離開），強制清除 tooltip
      if (activeElements.length === 0) {
        // 方法1: 使用 Chart.js API
        if (chart && chart.tooltip) {
          chart.tooltip.setActiveElements([], {x: 0, y: 0});
          chart.update('none');
        }
        
        // 方法2: 直接操作 DOM 元素
        setTimeout(() => {
          const tooltipElements = document.querySelectorAll('.chartjs-tooltip');
          tooltipElements.forEach(el => {
            (el as HTMLElement).style.opacity = '0';
            (el as HTMLElement).style.visibility = 'hidden';
          });
        }, 0);
      }
    }
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

  constructor(
    private route: ActivatedRoute, 
    private dataService: DataService, 
    private router: Router,
    private aiAssistantService: AiAssistantService
  ) {
    this.initializeDateRange();

    this.route.paramMap.subscribe(params => {
      this.politicianId = params.get('politicianId') || '';
      if (this.politicianId) {
        // 使用統一API載入初始數據
        this.loadInitialData();
        
        // 載入日期範圍 (用於時間篩選功能)
        this.loadDateRange();
      }
    });
  }

  // 新增方法：載入初始數據
  private loadInitialData(): void {
    console.log('🔄 載入初始數據...');
    
    // 首先載入立委的基本信息
    this.dataService.getLegislatorDetail(this.politicianId).subscribe({
      next: (basicData) => {
        console.log('✅ 載入立委基本信息成功:', basicData);
        
        // 更新基本數據
        this.data = basicData;
        
        // 載入罷免數據
        this.dataService.getRecallList().subscribe(recallList => {
          this.recallData = recallList.find(r => r["姓名"] === this.data.name);
        });
        
        // 然後使用統一API載入圖表數據
        this.loadChartData(365);
      },
      error: (error) => {
        console.error('❌ 載入立委基本信息失敗:', error);
      }
    });
  }

  // 新增方法：載入圖表數據
  private loadChartData(days: number): void {
    console.log(`🔄 載入圖表數據 (${days}天)...`);
    
    this.dataService.getLegislatorUnifiedData(this.politicianId, {
      days: days,
      includePieChart: true,
      includeTimeSeries: true,
      includeWordCloud: true,
      includeEmotion: true
    }).subscribe({
      next: (chartData) => {
        console.log('✅ 載入圖表數據成功');
        
        // 處理時間序列圖表數據
        if (chartData.time_series && chartData.time_series.labels && chartData.time_series.labels.length > 0) {
          this.demoLineChartData = chartData.time_series;
        }
        
        // 處理詞雲數據
        if (chartData.word_cloud && chartData.word_cloud.length > 0) {
          this.wordCloudData = chartData.word_cloud.map((item: any, index: number) => ({
            text: item.text || item.word || '',
            weight: item.weight || item.count || 0,
            color: this.getWordCloudColor(item.text || item.word || '', index)
          })).filter((item: any) => item.text && item.weight > 0);
        }
        
        // 處理圓餅圖數據
        if (chartData.sentiment_analysis) {
          this.updateSentimentChart({
            '反對罷免人數': chartData.sentiment_analysis.oppose_count || 0,
            '支持罷免人數': chartData.sentiment_analysis.support_count || 0,
            '中性人數': 0
          });
          
          // 更新統計數據
          this.positiveCount = chartData.sentiment_analysis.oppose_count || 0;  // 反對罷免
          this.negativeCount = chartData.sentiment_analysis.support_count || 0;  // 支持罷免
        }
        
        // 處理情緒分析數據
        if (chartData.emotion_analysis) {
          this.updateEmotionRadarChart(chartData.emotion_analysis);
        }
        
        // 設置初始篩選為一年
        this.currentFilter = '1year';
        this.updateDateRangeForPeriod(365);
      },
      error: (error) => {
        console.error('❌ 載入圖表數據失敗:', error);
      }
    });
  }

  private loadDateRange(): void {
    this.dataService.getLegislatorDateRange(this.politicianId).subscribe({
      next: (dateRangeData) => {          // 設定日期範圍限制和初始值
          if (dateRangeData && dateRangeData.start_date && dateRangeData.end_date) {
            this.minDate = dateRangeData.start_date;
            
            // 強制設置 maxDate 為今天
            const today = new Date();
            this.maxDate = today.toISOString().split('T')[0];

            // 計算一年前的日期
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            this.oneYearAgoDate = oneYearAgo.toISOString().split('T')[0];

            // 設定初始日期範圍為最近一年
            this.startDate = this.oneYearAgoDate;
            this.endDate = this.maxDate;
            
            // 移除這行，避免在初始化時觸發setQuickFilter
            // this.setQuickFilter('1year');
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
    console.log('處理legislators數據:', data);
    
    // 1. 情感分析圓餅圖 - 使用recall_support和recall_oppose
    if (data.recall_support !== undefined && data.recall_oppose !== undefined) {
      this.updateSentimentChart({
        '反對罷免人數': data.recall_oppose,
        '支持罷免人數': data.recall_support,
        '中性人數': 0
      });
    }
    
    // 2. 情緒雷達圖 - 使用emotion_analysis
    if (data.emotion_analysis && 
        (data.emotion_analysis.positive || data.emotion_analysis.negative)) {
      console.log('從 legislators 集合載入情緒雷達圖數據');
      this.updateEmotionRadarChart(data.emotion_analysis);
    }
    
    // 3. 文字雲 - 使用wordcloud_data
    if (data.wordcloud_data && data.wordcloud_data.length > 0) {
      // 轉換為新文字雲組件格式
      this.wordCloudData = data.wordcloud_data
        .map((item: any) => ({
        text: item.text || item.word || '',
        weight: item.weight || item.count || 0,
        color: this.getWordCloudColor(item.text || item.word || '', 0)
        }))
        .filter((item: any) => {
          // 只保留基本的有效性檢查
          return item.text && 
                 item.weight > 0 && 
                 item.text.length > 1; // 確保不是單字
        });
      console.log('從 legislators 集合載入文字雲', this.wordCloudData.length);
    } else {
      console.log('legislators 中沒有文字雲數據');
    }
    
    // 4. 時間序列統計 - 使用time_series_stats
    if (data.time_series_stats && Object.keys(data.time_series_stats).length > 0) {
      console.log('從 legislators 集合載入時間序列數據');
      // 處理時間序列數據
      this.processTimeSeriesStats(data.time_series_stats);
    } else {
      console.log('legislators 中沒有時間序列數據');
    }
  }
  
  // 新增方法：處理時間序列統計數據
  private processTimeSeriesStats(timeSeriesStats: any): void {
    // 根據當前篩選器選擇對應的時間範圍數據
    let selectedStats: any = null;
    
    switch (this.currentFilter) {
      case 'week':
        selectedStats = timeSeriesStats.recent_7_days_daily || timeSeriesStats.recent_7_days;
        break;
      case '2weeks':
        selectedStats = timeSeriesStats.recent_14_days_daily || timeSeriesStats.recent_14_days;
        break;
      case 'month':
        selectedStats = timeSeriesStats.recent_30_days_daily || timeSeriesStats.recent_30_days;
        break;
      case '3months':
        selectedStats = timeSeriesStats.recent_90_days_daily || timeSeriesStats.recent_90_days;
        break;
      case '6months':
        selectedStats = timeSeriesStats.recent_180_days_daily || timeSeriesStats.recent_180_days;
        break;
      case '1year':
        selectedStats = timeSeriesStats.recent_365_days_daily || timeSeriesStats.recent_365_days;
        break;
      default:
        selectedStats = timeSeriesStats.recent_7_days_daily || timeSeriesStats.recent_7_days;
    }
    
    if (selectedStats && selectedStats.stats_points && selectedStats.stats_points.length > 0) {
      console.log(`📊 使用時間範圍: ${selectedStats.description}`);
      
      // 按日期排序統計點
      const sortedPoints = selectedStats.stats_points.sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // 轉換為時間序列圖表格式
      const labels = sortedPoints.map((point: any) => {
        const date = new Date(point.date);
        return date.toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).replace(/\//g, '/');
      });
      
      // 計算累積數據，從歷史數據開始累積
      let cumulativeSupport = 0;
      let cumulativeOppose = 0;
      
      const supportData = sortedPoints.map((point: any) => {
        const emotionCounts = point.emotion_counts || {};
        // 負面情緒：sadness, anger, fear, disgust = 支持罷免
        const dailySupport = (emotionCounts.sadness || 0) + (emotionCounts.anger || 0) + 
               (emotionCounts.fear || 0) + (emotionCounts.disgust || 0);
        cumulativeSupport += dailySupport;
        return cumulativeSupport;
      });
      
      const opposeData = sortedPoints.map((point: any) => {
        const emotionCounts = point.emotion_counts || {};
        // 正面情緒：joy, trust, anticipation = 反對罷免
        const dailyOppose = (emotionCounts.joy || 0) + (emotionCounts.trust || 0) + 
               (emotionCounts.anticipation || 0);
        cumulativeOppose += dailyOppose;
        return cumulativeOppose;
      });
      
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
      
      console.log(`📊 時間序列圖表更新完成: ${labels.length}個數據點`);
      console.log(`📊 累積數據: 支持罷免=${cumulativeSupport}, 反對罷免=${cumulativeOppose}, 總計=${cumulativeSupport + cumulativeOppose}`);
      
      // 確保圓餅圖數據與時間圖數據一致
      this.positiveCount = cumulativeOppose;  // 反對罷免
      this.negativeCount = cumulativeSupport;  // 支持罷免
      
      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [this.positiveCount, this.negativeCount],
          backgroundColor: ['#4f8cff', '#f87171']
        }]
      };
      
      console.log(`📈 同步圓餅圖數據: 反對=${this.positiveCount}, 支持=${this.negativeCount}, 總計=${this.positiveCount + this.negativeCount}`);
      
      // 更新日期範圍顯示
      if (sortedPoints.length > 0) {
        const firstDate = new Date(sortedPoints[0].date);
        const lastDate = new Date(sortedPoints[sortedPoints.length - 1].date);
        
        this.startDate = firstDate.toISOString().split('T')[0];
        this.endDate = lastDate.toISOString().split('T')[0];
        
        console.log(`📅 更新日期範圍: ${this.startDate} 到 ${this.endDate}`);
      }
    } else {
      console.log('⚠️ 沒有找到對應的時間範圍數據');
    }
  }
  // 重新設計：統一的數據載入方法
  private loadCrawlerData(
    chartTypes: string[] = ['all'],
    startDate?: string,
    endDate?: string
  ): void {
    // 顯示加載狀態
    this.isLoadingTimeData = true;

    // 使用新的統一API，預設365天
    const options: any = {
      days: 365
    };

    // 根據chartTypes決定要包含哪些數據
    const shouldUpdateAll = chartTypes.includes('all');
    options.includePieChart = shouldUpdateAll || chartTypes.includes('sentiment');
    options.includeTimeSeries = shouldUpdateAll || chartTypes.includes('timeseries');
    options.includeWordCloud = shouldUpdateAll || chartTypes.includes('wordcloud');
    options.includeEmotion = shouldUpdateAll || chartTypes.includes('emotion');

    this.dataService.getLegislatorUnifiedData(this.politicianId, options).subscribe({
      next: (data) => {
        if (!data) {
          this.isLoadingTimeData = false;
          return;
        }
        this.updateSpecificCharts(data, chartTypes);
        this.isLoadingTimeData = false;
      },
      error: (error) => {
        console.error('載入數據失敗:', error);
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
    
    // 1. 詞雲 - 移除從 crawler_data 載入的邏輯，因為現在主要使用 legislators 集合
    if (shouldUpdateAll || chartTypes.includes('wordcloud')) {
      console.log('跳過從 crawler_data 載入文字雲，使用 legislators 集合數據');
    }

    // 2. 時間序列圖表
    if (shouldUpdateAll || chartTypes.includes('timeseries')) {
      if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
        
        // 準備數據，保持原本標籤格式
        const originalLabels = [...data.time_series.labels];
        const originalDatasets = data.time_series.datasets;
        
        // 確保數據是累積的
        const cumulativeDatasets = originalDatasets.map((dataset: any) => {
          let cumulativeSum = 0;
          const cumulativeData = dataset.data.map((value: number) => {
            cumulativeSum += value;
            return cumulativeSum;
          });
          
          // 強制添加今天的點（數據為0，但累計值保持不變）
          const finalCumulativeSum = cumulativeSum; // 保存最終累計值
          
          return { 
            ...dataset, 
            data: [...cumulativeData, finalCumulativeSum] // 添加今天的累計值
          };
        });

        // 生成今天的標籤，格式與前面的標籤保持一致
        const today = new Date();
        let todayLabel: string;
        
        // 檢查最後一個標籤的格式，決定今天標籤的格式
        const lastLabel = originalLabels[originalLabels.length - 1];
        if (lastLabel && lastLabel.includes('/') && lastLabel.split('/').length === 2) {
          // 如果是 MM/DD 格式，今天也用 YYYY/MM/DD
          todayLabel = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        } else if (lastLabel && lastLabel.includes('-') && lastLabel.split('-').length === 3) {
          // 如果是 YYYY-MM-DD 格式，今天也用 YYYY-MM-DD
          todayLabel = today.toISOString().split('T')[0];
        } else if (lastLabel && lastLabel.includes('-') && lastLabel.split('-').length === 2) {
          // 如果是 YYYY-MM 格式，今天也用 YYYY-MM
          todayLabel = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // 預設使用 YYYY/MM/DD 格式
          todayLabel = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        }
        
        // 檢查最後一個標籤是否已經是今天
        const finalLabels = (lastLabel !== todayLabel) ? 
          [...originalLabels, todayLabel] : 
          originalLabels;

        this.demoLineChartData = {
          labels: finalLabels,
          datasets: cumulativeDatasets
        };
        
        console.log(`時間序列包含今天的點: ${finalLabels[finalLabels.length - 1]}`);
        
      } else {
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

    // 使用 adjustDataPointDensity 根據當前篩選器調整數據點密度
    const adjustedMonthlyStats = this.adjustDataPointDensity(monthlyStats, this.currentFilter);

    // 按日期排序月份
    const sortedMonths = Object.keys(adjustedMonthlyStats).sort();
      // 準備時間序列數據
    const labels: string[] = [];
    const supportData: number[] = [];
    const opposeData: number[] = [];
    
    // 用於累加計算
    let cumulativeSupport = 0;
    let cumulativeOppose = 0;
    
    // 處理每個月份的數據
    sortedMonths.forEach(month => {
      const monthData = adjustedMonthlyStats[month];
      
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
          // 根據時間範圍決定標籤格式
          const [year, monthNum] = month.split('-');
          let label: string;

          // 如果是近期數據（7天內），顯示年月日格式
          if (this.currentFilter === 'week' || this.currentFilter === '2weeks') {
            // 對於週級別的篩選，假設使用月份的第一天
            label = `${year}年${monthNum}月01日`;
          } else {
            // 其他情況使用年月格式
            label = `${year}年${monthNum}月`;
          }

          labels.push(label);
          
          // 計算累加值
          cumulativeSupport += supportCount;
          cumulativeOppose += opposeCount;
          
          // 添加累加後的支持和反對數據
          supportData.push(cumulativeSupport);
          opposeData.push(cumulativeOppose);
        }
      }
    });
    
    // 生成今天的標籤，格式與前面的標籤保持一致
    const today = new Date();
    let todayLabel: string;
    
    // 檢查是否有現有標籤來決定格式
    if (labels.length > 0) {
      const lastLabel = labels[labels.length - 1];
      if (lastLabel.includes('年') && lastLabel.includes('月')) {
        // 如果是 YYYY年MM月 格式，今天也用 YYYY年MM月
        todayLabel = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月`;
      } else if (lastLabel.includes('/') && lastLabel.split('/').length === 2) {
        // 如果是 MM/DD 格式，今天也用 YYYY/MM/DD
        todayLabel = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
      } else if (lastLabel.includes('-') && lastLabel.split('-').length === 3) {
        // 如果是 YYYY-MM-DD 格式，今天也用 YYYY-MM-DD
        todayLabel = today.toISOString().split('T')[0];
      } else if (lastLabel.includes('-') && lastLabel.split('-').length === 2) {
        // 如果是 YYYY-MM 格式，今天也用 YYYY-MM
        todayLabel = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // 預設使用年月格式
        todayLabel = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月`;
      }
    } else {
      // 如果沒有現有標籤，預設使用年月格式
      todayLabel = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月`;
    }
    
    // 檢查最後一個標籤是否已經是今天
    const lastLabel = labels[labels.length - 1];
    if (!lastLabel || lastLabel !== todayLabel) {
      labels.push(todayLabel);
      // 今天的數據為0，但累計值保持不變
      supportData.push(cumulativeSupport);
      opposeData.push(cumulativeOppose);
    }
    
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
    console.log('更新情感分析圓餅圖，原始數據：', JSON.stringify(sentimentData));
    
    if (!sentimentData) {
      console.log('沒有情感分析數據');
      return;
    }

    // 處理emotion_analysis格式：{positive: {...}, negative: {...}}
    if (sentimentData.positive && sentimentData.negative) {
      console.log('檢測到emotion_analysis格式數據');
      
      // 計算positive和negative的總和
      const positiveTotal = Object.values(sentimentData.positive).reduce((sum: number, val: any) => sum + (val || 0), 0);
      const negativeTotal = Object.values(sentimentData.negative).reduce((sum: number, val: any) => sum + (val || 0), 0);
      
      this.positiveCount = positiveTotal;  // positive = 反對罷免
      this.negativeCount = negativeTotal;  // negative = 支持罷免
      
      console.log(`情感分析數據: 反對=${this.positiveCount}, 支持=${this.negativeCount}, 總人數=${this.positiveCount + this.negativeCount}`);
    } else {
      // 支持多種可能的數據格式
      // 格式1: { 反對罷免人數: X, 支持罷免人數: Y }
      // 格式2: { oppose_count: X, support_count: Y }
      // 格式3: { positive: X, negative: Y }
      
      // 先嘗試獲取所有可能的值
      const opposeCounts = [
        sentimentData.反對罷免人數,
        sentimentData.oppose_count,
        sentimentData.positive
      ].filter(val => val !== undefined && val !== null);
      
      const supportCounts = [
        sentimentData.支持罷免人數,
        sentimentData.support_count,
        sentimentData.negative
      ].filter(val => val !== undefined && val !== null);
      
      // 使用找到的第一個有效值，如果都沒有則為0
      this.positiveCount = opposeCounts.length > 0 ? opposeCounts[0] : 0;
      this.negativeCount = supportCounts.length > 0 ? supportCounts[0] : 0;

      // 如果數據為0，顯示一個提示
      const total = this.positiveCount + this.negativeCount;
      if (total === 0) {
        console.log('情感分析數據總數為0');
      } else {
        console.log(`情感分析數據: 反對=${this.positiveCount}, 支持=${this.negativeCount}, 總人數=${total}`);
      }
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

  // 從time_series_stats計算情感分析數據
  private calculateSentimentFromTimeSeriesStats(timeSeriesStats: any): void {
    // 根據當前篩選器選擇對應的時間範圍數據
    let selectedStats: any = null;
    
    switch (this.currentFilter) {
      case 'week':
        selectedStats = timeSeriesStats.recent_7_days;
        break;
      case '2weeks':
        selectedStats = timeSeriesStats.recent_14_days;
        break;
      case 'month':
        selectedStats = timeSeriesStats.recent_30_days;
        break;
      case '3months':
        selectedStats = timeSeriesStats.recent_90_days;
        break;
      case '6months':
        selectedStats = timeSeriesStats.recent_180_days;
        break;
      case '1year':
        selectedStats = timeSeriesStats.recent_365_days;
        break;
      default:
        selectedStats = timeSeriesStats.recent_7_days;
    }
    
    if (selectedStats && selectedStats.stats_points && selectedStats.stats_points.length > 0) {
      console.log(`📊 使用時間範圍: ${selectedStats.description}`);
      
      // 計算該時間範圍內的總情感分析數據
      let totalSupport = 0;
      let totalOppose = 0;
      
      for (const point of selectedStats.stats_points) {
        if (point.emotion_counts) {
          const emotionCounts = point.emotion_counts;
          // 負面情緒：sadness, anger, fear, disgust = 支持罷免
          const supportCount = (emotionCounts.sadness || 0) + 
                             (emotionCounts.anger || 0) + 
                             (emotionCounts.fear || 0) + 
                             (emotionCounts.disgust || 0);
          // 正面情緒：joy, trust, anticipation = 反對罷免
          const opposeCount = (emotionCounts.joy || 0) + 
                             (emotionCounts.trust || 0) + 
                             (emotionCounts.anticipation || 0);
          
          totalSupport += supportCount;
          totalOppose += opposeCount;
        }
      }
      
      // 更新圓餅圖數據
      this.positiveCount = totalOppose;  // 反對罷免
      this.negativeCount = totalSupport;  // 支持罷免
      
      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [this.positiveCount, this.negativeCount],
          backgroundColor: ['#4f8cff', '#f87171']
        }]
      };
      
      console.log(`📈 從time_series_stats計算情感分析: 反對=${totalOppose}, 支持=${totalSupport}, 總計=${totalSupport + totalOppose}`);
    } else {
      console.log('⚠️ 沒有找到對應的時間範圍數據');
    }
  }

  get party(): string {
    if (!this.data?.constituency) return '';
    
    // 如果constituency是字符串，直接返回
    if (typeof this.data.constituency === 'string') {
      return this.data.party || '';
    }
    
    // 如果constituency是數組，查找黨籍信息
    if (Array.isArray(this.data.constituency)) {
      const found = this.data.constituency.find((c: string) => c.startsWith('黨籍：'));
      return found ? found.split('：')[1] : '';
    }
    
    return '';
  }
  
  get district(): string {
    if (!this.data?.constituency) return '';
    
    // 如果constituency是字符串，直接返回
    if (typeof this.data.constituency === 'string') {
      return this.data.constituency || '';
    }
    
    // 如果constituency是數組，查找選區信息
    if (Array.isArray(this.data.constituency)) {
      const found = this.data.constituency.find((c: string) => c.startsWith('選區：'));
      return found ? found.split('：')[1] : '';
    }
    
    return '';
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
    console.log(`🔍 setQuickFilter 被調用，參數: ${period}`);
    console.log(`🔍 當前 politicianId: ${this.politicianId}`);
    
    this.currentFilter = period; // 記錄當前篩選狀態

    // 顯示加載狀態
    this.isLoadingTimeData = true;
    console.log('⏳ 設置加載狀態為 true');

    // 將前端時間範圍映射到天數
    let days: number;
    
    switch (period) {
      case 'week':
        days = 7;
        break;
      case '2weeks':
        days = 14;
        break;
      case 'month':
        days = 30;
        break;
      case '3months':
        days = 90;
        break;
      case '6months':
        days = 180;
        break;
      case '1year':
        days = 365;
        break;
      case 'all':
        days = 365; // 預設一年
        break;
      default:
        days = 30;
    }
    
    console.log(`設置時間範圍: ${period} -> ${days}天`);

    // 更新日期範圍顯示
    this.updateDateRangeForPeriod(days);

    // 使用新的統一API獲取數據
    console.log(`🌐 調用統一API: getLegislatorUnifiedData(${this.politicianId}, {days: ${days}})`);
    this.dataService.getLegislatorUnifiedData(this.politicianId, {
      days: days,
      includePieChart: true,
      includeTimeSeries: true,
      includeWordCloud: true,
      includeEmotion: true
    }).subscribe({
      next: (data) => {
        console.log('✅ 統一API調用成功，收到數據:', data ? '有數據' : '無數據');
        if (data) {
          console.log('✅ 成功獲取統一API數據');
          
          // 處理時間序列圖表數據
          if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
            this.demoLineChartData = data.time_series;
            console.log('📊 更新時間序列圖表');
            
            // 根據時間序列數據更新日期範圍
            if (data.time_series.labels.length > 0) {
              const firstLabel = data.time_series.labels[0];
              const lastLabel = data.time_series.labels[data.time_series.labels.length - 1];
              
              // 嘗試解析日期標籤
              try {
                // 處理 YYYY/MM/DD 格式
                if (firstLabel.includes('/')) {
                  const firstDate = new Date(firstLabel.replace(/\//g, '-'));
                  const lastDate = new Date(lastLabel.replace(/\//g, '-'));
                  
                  this.startDate = firstDate.toISOString().split('T')[0];
                  this.endDate = lastDate.toISOString().split('T')[0];
                  
                  console.log(`📅 從時間序列更新日期範圍: ${this.startDate} 到 ${this.endDate}`);
                }
              } catch (e) {
                console.log('⚠️ 無法解析時間序列標籤格式');
              }
            }
          }
          
          // 處理詞雲數據
          if (data.word_cloud && data.word_cloud.length > 0) {
            this.wordCloudData = data.word_cloud.map((item: any, index: number) => ({
              text: item.text || item.word || '',
              weight: item.weight || item.count || 0,
              color: this.getWordCloudColor(item.text || item.word || '', index)
            })).filter((item: any) => item.text && item.weight > 0);
            console.log('☁️ 更新詞雲數據');
          }
          
          // 處理圓餅圖數據
          if (data.sentiment_analysis) {
            console.log('📈 更新圓餅圖數據:', data.sentiment_analysis);
            this.updateSentimentChart({
              '反對罷免人數': data.sentiment_analysis.oppose_count || 0,
              '支持罷免人數': data.sentiment_analysis.support_count || 0,
              '中性人數': 0
            });
            
            // 更新統計數據 - 確保與updateSentimentChart中的邏輯一致
            this.positiveCount = data.sentiment_analysis.oppose_count || 0;  // 反對罷免
            this.negativeCount = data.sentiment_analysis.support_count || 0;  // 支持罷免
            
            console.log(`📊 更新統計數據: 反對=${this.positiveCount}, 支持=${this.negativeCount}, 總計=${this.positiveCount + this.negativeCount}`);
          }
          
          // 處理情緒分析數據
          if (data.emotion_analysis) {
            this.updateEmotionRadarChart(data.emotion_analysis);
            console.log('📊 更新情緒分析圖表');
          }
          
          console.log('✅ 所有圖表更新完成');
        }
        this.isLoadingTimeData = false;
      },
      error: (error) => {
        console.error('❌ 統一API調用失敗:', error);
        this.isLoadingTimeData = false;
      }
    });
  }

  // 新增方法：根據天數更新日期範圍
  private updateDateRangeForPeriod(days: number): void {
    const endDate = new Date(); // 今天
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1); // 往前推 days-1 天
    
    this.startDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 格式
    this.endDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD 格式
    
    console.log(`📅 更新日期範圍: ${this.startDate} 到 ${this.endDate} (${days}天)`);
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

    return colors[index % colors.length];
  }

  // 文字雲點擊事件處理
  onWordCloudClick(clickedWord: CloudData): void {
    console.log('點擊了關鍵字:', clickedWord);
    
    // 獲取當前立委名稱
    const legislatorName = this.politicianId || this.data?.name || '';
    
    // 構建解釋請求訊息
    const explanationMessage = legislatorName 
      ? `請解釋${legislatorName}的文字雲中「${clickedWord.text}」這個關鍵詞的含義和背景`
      : `請解釋文字雲中「${clickedWord.text}」這個關鍵詞的含義`;
    
    // 直接調用AI聊天服務
    this.aiAssistantService.sendMessage(explanationMessage).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('AI 詞彙解釋成功:', response);
          // 可以在這裡添加一些用戶反饋，比如顯示一個小提示
          console.log(`詞彙「${clickedWord.text}」的解釋已發送到AI聊天窗口`);
        } else {
          console.error('AI 詞彙解釋失敗:', response.error);
        }
      },
      error: (error) => {
        console.error('獲取 AI 詞彙解釋失敗:', error);
      }
    });
  }

  // 動態調整數據點密度 - 漸進式密度變化
  private adjustDataPointDensity(monthlyStats: any, timeRange: string): any {
    if (!monthlyStats || Object.keys(monthlyStats).length === 0) {
      return {};
    }

    // 檢查數據格式 - 是否為月度數據還是日期數據
    const isDateFormat = Object.keys(monthlyStats).some(key => key.includes('-') && key.split('-').length >= 3);
    
    // 按日期排序
    const sortedKeys = Object.keys(monthlyStats).sort();
    
    // 如果資料點太少，不需要調整
    if (sortedKeys.length <= 6) {
      return monthlyStats;
    }
    
    // 獲取時間範圍的總天數
    const getTotalDays = (range: string): number => {
      switch (range) {
        case '1year': return 365;
        case '6months': return 180;
        case '3months': return 90;
        case 'month': return 30;
        case '2weeks': return 14;
        case 'week': return 7;
        default: return 365;
      }
    };

    const totalDays = getTotalDays(timeRange);
    
    // 漸進式密度算法 - 近期密集，遠期稀疏
    const getProgressiveInterval = (dayFromEnd: number, totalDays: number): number => {
      const ratio = dayFromEnd / totalDays; // 0 (最新) 到 1 (最舊)
      
      if (timeRange === '1year') {
        // 一年內：最新7天(1天1點) -> 30天(3天1點) -> 90天(7天1點) -> 其餘(30天1點)
        if (ratio <= 0.02) return 1;      // 最新2% (約7天) - 每日
        if (ratio <= 0.08) return 3;      // 接下來6% (約30天) - 3天1點
        if (ratio <= 0.25) return 7;      // 接下來17% (約90天) - 週度
        return 30;                        // 其餘 - 月度
      } else if (timeRange === '6months') {
        // 六個月：最新7天(1天1點) -> 30天(2天1點) -> 其餘(15天1點)
        if (ratio <= 0.04) return 1;      // 最新4% (約7天) - 每日
        if (ratio <= 0.17) return 2;      // 接下來13% (約30天) - 2天1點
        return 15;                        // 其餘 - 半月度
      } else if (timeRange === '3months') {
        // 三個月：最新7天(1天1點) -> 30天(3天1點) -> 其餘(7天1點)
        if (ratio <= 0.08) return 1;      // 最新8% (約7天) - 每日
        if (ratio <= 0.33) return 3;      // 接下來25% (約30天) - 3天1點
        return 7;                         // 其餘 - 週度
      } else if (timeRange === 'month') {
        // 一個月：最新7天(1天1點) -> 15天(2天1點) -> 其餘(3天1點)
        if (ratio <= 0.23) return 1;      // 最新23% (約7天) - 每日
        if (ratio <= 0.50) return 2;      // 接下來27% (約8天) - 2天1點
        return 3;                         // 其餘 - 3天1點
      } else if (timeRange === '2weeks') {
        // 兩週：最新3天(1天1點) -> 7天(1天1點) -> 其餘(2天1點)
        if (ratio <= 0.21) return 1;      // 最新21% (約3天) - 每日
        if (ratio <= 0.50) return 1;      // 接下來29% (約4天) - 每日
        return 2;                         // 其餘 - 2天1點
      } else {
        // 一週：最新3天(1天1點) -> 其餘(1天1點)
        return 1;                         // 所有時間每天一點
      }
    };
    
    const adjustedStats: any = {};
    
    if (isDateFormat) {
      // 日期數據的漸進式處理
      const latestDate = new Date(sortedKeys[sortedKeys.length - 1]);
      let lastIncludedDate: string | null = null;
      
      // 從最新到最舊處理
      for (let i = sortedKeys.length - 1; i >= 0; i--) {
        const dateKey = sortedKeys[i];
        const currentDate = new Date(dateKey);
        
        // 計算距離最新日期的天數
        const dayFromEnd = Math.floor((latestDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 獲取當前位置應該使用的間隔
        const requiredInterval = getProgressiveInterval(dayFromEnd, totalDays);
        
        if (!lastIncludedDate) {
          // 最新的點總是包含
          adjustedStats[dateKey] = monthlyStats[dateKey];
          lastIncludedDate = dateKey;
        } else {
          // 檢查與上一個包含點的間隔
          const lastDate = new Date(lastIncludedDate);
          const dayDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff >= requiredInterval) {
            adjustedStats[dateKey] = monthlyStats[dateKey];
            lastIncludedDate = dateKey;
          }
        }
      }
    } else {
      // 月份數據的漸進式處理
      let lastIncludedIndex: number | null = null;
      
      // 從最新到最舊處理
      for (let i = sortedKeys.length - 1; i >= 0; i--) {
        const monthKey = sortedKeys[i];
        
        // 計算距離最新月份的位置比例
        const ratio = (sortedKeys.length - 1 - i) / (sortedKeys.length - 1);
        
        // 獲取當前位置應該使用的間隔
        const requiredInterval = timeRange === '1year' ? 
          (ratio <= 0.25 ? 1 : 2) :  // 一年內：前25%每月，後75%每2月
          1;                          // 其他情況每月
        
        if (lastIncludedIndex === null) {
          // 最新的點總是包含
          adjustedStats[monthKey] = monthlyStats[monthKey];
          lastIncludedIndex = i;
        } else {
          const indexDiff = lastIncludedIndex - i;
          if (indexDiff >= requiredInterval) {
            adjustedStats[monthKey] = monthlyStats[monthKey];
            lastIncludedIndex = i;
          }
        }
      }
    }
    
    // 確保最舊的數據點也被保留（起始點）
    const oldestKey = sortedKeys[0];
    if (!adjustedStats[oldestKey]) {
      adjustedStats[oldestKey] = monthlyStats[oldestKey];
    }
    
    console.log(`${timeRange} 漸進式密度調整: 原始${sortedKeys.length}點 -> 調整後${Object.keys(adjustedStats).length}點`);
    
    return adjustedStats;
  }

  goToMainPage(): void {
    this.router.navigate(['/']);
  }

  // 格式化日期範圍顯示
  formatDateRange(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 格式化為 YYYY/MM/DD 格式
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  // 計算日期範圍的天數
  getDateRangeDays(): number {
    if (!this.startDate || !this.endDate) return 0;
    
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    // 計算天數差異
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(1, daysDiff); // 至少返回1天
  }
}