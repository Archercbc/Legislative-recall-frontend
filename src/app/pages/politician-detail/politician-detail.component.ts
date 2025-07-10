import { Component } from '@angular/core';
import {  Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
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

  constructor(private route: ActivatedRoute, private dataService: DataService, private router: Router) {
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
            
            // 設置默認篩選為一年內
            this.setQuickFilter('1year');
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
      // 轉換為新文字雲組件格式
      this.wordCloudData = data.word_cloud.map((item: any) => ({
        text: item.text || item.word || '',
        weight: item.weight || item.count || 0,
        color: this.getWordCloudColor(item.text || item.word || '', 0)
      })).filter((item: any) => item.text && item.weight > 0);
      console.log('從 legislators 集合載入文字雲', this.wordCloudData.length);
    }
    
    // 4. 月份情感統計 - 從 legislators 集合獲取並轉換為時間序列數據
    if (data.月份情感統計 && Object.keys(data.月份情感統計).length > 0) {    // 只顯示一年內的資料
    const filteredMonthlyData = this.filterToLastYear(data.月份情感統計);
    // 處理時間序列
    this.updateTimeSeriesFromMonthlyStats(filteredMonthlyData);
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
        // 轉換為新文字雲組件格式
        this.wordCloudData = data.word_cloud.map((item: any, index: number) => ({
          text: item.text || item.word || '',
          weight: item.weight || item.count || 0,
          color: this.getWordCloudColor(item.text || item.word || '', index)
        })).filter((item: any) => item.text && item.weight > 0);
      } else {
        console.log('crawler_data 中沒有文字雲數據');
      }
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
          // 如果是 MM/DD 格式，今天也用 MM/DD
          todayLabel = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        } else if (lastLabel && lastLabel.includes('-') && lastLabel.split('-').length === 3) {
          // 如果是 YYYY-MM-DD 格式，今天也用 YYYY-MM-DD
          todayLabel = today.toISOString().split('T')[0];
        } else if (lastLabel && lastLabel.includes('-') && lastLabel.split('-').length === 2) {
          // 如果是 YYYY-MM 格式，今天也用 YYYY-MM
          todayLabel = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // 預設使用 MM/DD 格式
          todayLabel = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
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
        // 如果是 MM/DD 格式，今天也用 MM/DD
        todayLabel = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
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
    
    if (!this.maxDate) {
      return;
    }

    // 使用 maxDate (今天) 作為基準
    const maxDate = new Date(this.maxDate);

    // 計算日期差異 (從今天往前推的天數)
    const calculateDaysBack = (days: number) => {
      const newStartDate = new Date(maxDate.getTime() - days * 24 * 60 * 60 * 1000);
      const newStartDateStr = newStartDate.toISOString().split('T')[0];
      // 不早於 minDate
      return newStartDateStr > this.minDate ? newStartDateStr : this.minDate;
    };

    // 顯示加載狀態
    this.isLoadingTimeData = true;

    switch (period) {
      case 'week':
        this.startDate = calculateDaysBack(7); // 7天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      case '2weeks':
        this.startDate = calculateDaysBack(14); // 14天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      case 'month':
        this.startDate = calculateDaysBack(30); // 30天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      case '3months':
        this.startDate = calculateDaysBack(90); // 90天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      case '6months':
        this.startDate = calculateDaysBack(180); // 180天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      case '1year':
        this.startDate = calculateDaysBack(365); // 365天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      case 'all':
        // 全部時間：設定為完整時間範圍
        this.startDate = this.minDate;
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
        break;
      default:
        this.startDate = calculateDaysBack(30); // 預設30天
        this.endDate = maxDate.toISOString().split('T')[0]; // <-- 在這裡進行轉換
    }
    
    console.log(`設置時間範圍: ${this.startDate} 到 ${this.endDate} (${period})`);

    // 觸發數據更新
    this.updateChartsForTimeRange();
  }

  // 統一的時間範圍數據更新方法
  private updateChartsForTimeRange(): void {
    // 檢查是否有預計算數據可用
    if (!this.data || !this.data.月份情感統計 || Object.keys(this.data.月份情感統計).length === 0) {
      console.log('⚠️ 沒有預計算數據，無法更新圖表');
      this.isLoadingTimeData = false;
      return;
    }

    console.log('✅ 使用 legislators 集合中的預計算數據進行時間範圍篩選');

    // 根據時間範圍篩選月份數據
    const filteredMonthlyStats = this.filterMonthlyStatsByDateRange(
      this.data.月份情感統計,
      this.startDate,
      this.endDate
    );

    // 更新時間序列圖（使用篩選後的數據和動態密度）
    this.updateTimeSeriesFromMonthlyStats(filteredMonthlyStats);

    // 更新圓餅圖（使用篩選後數據重新計算）
    const filteredSentimentStats = this.calculateSentimentFromFilteredData(filteredMonthlyStats);
    this.updateSentimentChart(filteredSentimentStats);

    // 更新雷達圖（使用篩選後數據重新計算）
    const filteredEmotionStats = this.calculateEmotionFromFilteredData(filteredMonthlyStats);
    this.updateEmotionRadarChart(filteredEmotionStats);

    // 文字雲暫時使用完整數據（因為通常不按時間篩選）
    if (this.data.word_cloud && this.data.word_cloud.length > 0) {
      this.wordCloudData = this.data.word_cloud.map((item: any, index: number) => ({
        text: item.text || item.word || '',
        weight: item.weight || item.count || 0,
        color: this.getWordCloudColor(item.text || item.word || '', index)
      })).filter((item: any) => item.text && item.weight > 0);
    }

    // 完成後關閉加載狀態
    this.isLoadingTimeData = false;
  }

  // 根據日期範圍篩選月份統計數據
  private filterMonthlyStatsByDateRange(monthlyStats: any, startDate: string, endDate: string): any {
    if (!monthlyStats || !startDate || !endDate) {
      return monthlyStats;
    }

    const filteredStats: any = {};
    const start = new Date(startDate);
    const end = new Date(endDate);

    Object.keys(monthlyStats).forEach(monthKey => {
      // 假設monthKey格式為 YYYY-MM
      if (monthKey.match(/^\d{4}-\d{2}$/)) {
        const monthDate = new Date(monthKey + '-01'); // 轉換為該月第一天

        if (monthDate >= start && monthDate <= end) {
          filteredStats[monthKey] = monthlyStats[monthKey];
        }
      }
    });

    console.log(`📅 時間範圍篩選: ${startDate} 到 ${endDate}, 篩選出 ${Object.keys(filteredStats).length} 個月份`);
    return filteredStats;
  }

  // 從篩選後的月份數據計算情感統計
  private calculateSentimentFromFilteredData(filteredMonthlyStats: any): any {
    let totalSupport = 0;
    let totalOppose = 0;

    Object.values(filteredMonthlyStats).forEach((monthData: any) => {
      if (monthData) {
        totalSupport += monthData.支持罷免人數 || monthData.support_count || 0;
        totalOppose += monthData.反對罷免人數 || monthData.oppose_count || 0;
      }
    });

    return {
      支持罷免人數: totalSupport,
      反對罷免人數: totalOppose
    };
  }

  // 從篩選後的月份數據計算情緒統計
  private calculateEmotionFromFilteredData(filteredMonthlyStats: any): any {
    const emotionTotals: any = {};

    Object.values(filteredMonthlyStats).forEach((monthData: any) => {
      if (monthData && monthData.情緒統計) {
        Object.keys(monthData.情緒統計).forEach(emotion => {
          emotionTotals[emotion] = (emotionTotals[emotion] || 0) + (monthData.情緒統計[emotion] || 0);
        });
      }
    });

    return emotionTotals;
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

  // 只格式化日期部分 (不含時間)
  formatDateOnly(dateStr: string): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'numeric',
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
    const maxWeight = Math.max(...this.wordCloudData.map(w => w.weight || 1)); // 處理沒有 weight 的情況
    if (maxWeight === 0) return minSize; // 避免除以零
    const ratio = weight / maxWeight;
    return Math.round(minSize + (maxSize - minSize) * ratio);
  }

  // 文字雲專用的大小計算（更大的範圍，出現次數多的在中間且更大）
  getWordCloudSize(weight: number, index: number): number {
    if (!this.wordCloudData.length) return 14;

    const maxWeight = Math.max(...this.wordCloudData.map(w => w.weight || 1));
    const minWeight = Math.min(...this.wordCloudData.map(w => w.weight || 1));

    if (maxWeight === minWeight) return 18;

    // 根據權重計算大小 (16-48px)
    const minSize = 24;
    const maxSize = 64;
    const ratio = (weight - minWeight) / (maxWeight - minWeight);

    // 前幾個（權重高的）詞語更大
    const sizeBonus = index < 3 ? 6 : index < 6 ? 4 : index < 10 ? 2 : 0;

    return Math.round(minSize + (maxSize - minSize) * ratio) + sizeBonus;
  }

  // 計算文字雲的最大權重
  get maxWordWeight(): number {
    if (!this.wordCloudData.length) return 1;
    return Math.max(...this.wordCloudData.map(w => w.weight || 1));
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
    // 這裡可以添加更多互動功能，比如搜索相關內容
  }

  // 獲取隨機角度（-30到30度之間）
  getRandomAngle(index: number): number {
    // 使用索引作為種子，確保每次都相同，但不同詞語有不同角度
    const seed = index * 137.5 + 42;
    // 生成-30到30度之間的隨機角度
    return ((seed % 60) - 30);
  }

  // 獲取詞語位置（環繞排列）
  getWordPosition(index: number, type: 'top' | 'left'): number {
    const totalWords = this.wordCloudData.length;
    if (totalWords <= 0) return 50;

    // 前幾個高頻詞放在中間位置
    if (index < 3) {
      // 前3個詞位於中心區域 (40%-60%)
      const centerOffset = ((index % 3) * 10) - 10; // -10, 0, 10
      return type === 'top' ? 50 + centerOffset : 50 + centerOffset;
    }

    // 其餘詞語環繞排列
    // 用索引生成角度 (0-360度)
    const angle = (index * (360 / (totalWords - 3))) % 360;
    // 距離中心的半徑 (20-40之間，索引越大半徑越大)
    const radius = 20 + (index / totalWords) * 20;
    
    // 將極坐標轉換為直角坐標 (中心點為50,50)
    if (type === 'top') {
      return 50 + radius * Math.sin(angle * Math.PI / 180);
    } else { // left
      return 50 + radius * Math.cos(angle * Math.PI / 180);
    }
  }

  // 取得罷免案狀態的樣式類別
  getRecallStatusClass(): string {
    if (!this.recallData || !this.recallData['罷免狀態']) {
      return '';
    }

    const status = this.recallData['罷免狀態'];
    
    // 根據狀態返回不同的樣式類別
    if (status.includes('成功')) {
      return 'status-success';
    } else if (status.includes('失敗')) {
      return 'status-failed';
    } else if (status.includes('進行中')) {
      return 'status-ongoing';
    } else if (status.includes('需補件')) {
      return 'status-supplement';
    } else {
      return 'status-default';
    }
  }

  // 增加一個方法，用來篩選一年內的月份資料
  private filterToLastYear(monthlyData: any): any {
    // 獲取當前日期
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    oneYearAgo.setDate(1); // 設為該月第一天
    
    // 轉換為 YYYY-MM 格式，方便比較
    const oneYearAgoStr = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}`;
    
    // 篩選月份資料
    const filteredData: any = {};
    Object.keys(monthlyData).forEach(monthKey => {
      // 確保月份格式為 YYYY-MM
      if (monthKey >= oneYearAgoStr) {
        filteredData[monthKey] = monthlyData[monthKey];
      }
    });
    
    return filteredData;
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
}