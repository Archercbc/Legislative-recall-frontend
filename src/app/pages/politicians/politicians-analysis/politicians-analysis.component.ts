import { Component, ViewChild } from '@angular/core';
import {  Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { PoliticianService } from '../../../services/politician.service';
import { AiAssistantService } from '../../../services/ai-assistant.service';
import { TimeSeriesFilterService, FilteredTimeSeriesData } from '../../../services/time-series-filter.service';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';

import { IconModule } from '@coreui/icons-angular';

import { ChartjsComponent } from '@coreui/angular-chartjs';
import { Chart, Tooltip, type ChartData } from 'chart.js'; // 確保導入 ChartData 類型
import { AnnotationOptions, LabelPosition } from 'chartjs-plugin-annotation';
import annotationPlugin from 'chartjs-plugin-annotation';
import { TagCloudComponent, CloudData, CloudOptions } from 'angular-tag-cloud-module';

@Component({
  selector: 'app-politicians-analysis',
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
  templateUrl: './politicians-analysis.component.html',
  styleUrl: './politicians-analysis.component.scss'
})
export class PoliticiansAnalysisComponent {
  politicianId = '';
  data: any = null;
  recallData: any = null;
  opposeCount = 0;  // 反對罷免人數
  supportCount = 0; // 支持罷免人數

  // 時間範圍相關
  selectedTimeRange: string = '365_days';
  availableIntervals: string[] = ['7_days', '14_days', '30_days', '90_days', '180_days', '365_days'];
  chartTitle: string = '近一年罷免支持度累計趨勢';
  
  // 事件標記相關
  showEventMarkers: boolean = false;
  
  // 線圖選項
  lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    }
  };

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


  // 被封關的立委列表
  private readonly BLOCKED_LEGISLATORS = [''];

  // 時間範圍篩選相關屬性
  filteredTimeSeriesData: FilteredTimeSeriesData | null = null;
  
  @ViewChild('lineChart') lineChartComponent!: ChartjsComponent;

  // 獲取可用的時間間隔
  getAvailableIntervals(): void {
    if (this.data?.time_series_stats) {
      this.availableIntervals = this.timeSeriesFilterService.getAvailableIntervals(this.data.time_series_stats);
    } else {
      console.warn('⚠️ getAvailableIntervals: 沒有時間序列統計數據');
    }
  }
  

  // 根據時間範圍獲取天數
  private getDaysFromTimeRange(timeRange: string): number {
    const daysMap: { [key: string]: number } = {
      '7_days': 7,
      '14_days': 14,
      '30_days': 30,
      '90_days': 90,
      '180_days': 180,
      '365_days': 365
    };
    return daysMap[timeRange] || 30;
  }
  
  // 更新圖表標題
  private updateChartTitle(timeRange: string): void {
    const titleMap: { [key: string]: string } = {
      '7_days': '近一週罷免支持度累計趨勢',
      '14_days': '近兩週罷免支持度累計趨勢',
      '30_days': '近一個月罷免支持度累計趨勢',
      '90_days': '近三個月罷免支持度累計趨勢',
      '180_days': '近半年罷免支持度累計趨勢',
      '365_days': '近一年罷免支持度累計趨勢'
    };
    this.chartTitle = titleMap[timeRange] || '近一年罷免支持度累計趨勢';
  }
  
  // 同步 selectedTimeRange 與 currentFilter
  private syncSelectedTimeRangeWithFilter(period: string): void {
    const timeRangeMap: { [key: string]: string } = {
      'week': '7_days',
      '2weeks': '14_days',
      'month': '30_days',
      '3months': '90_days',
      '6months': '180_days',
      '1year': '365_days',
      'all': '365_days'
    };
    this.selectedTimeRange = timeRangeMap[period] || '365_days';
  }
  
  // 切換事件標記點顯示
  toggleEventMarkers(): void {
    this.showEventMarkers = !this.showEventMarkers;
    
    // 立即更新圖表選項
    this.updateLineChartOptionsForEventMarkers();
    
    // 強制觸發變更檢測
    setTimeout(() => {
      // 如果圖表組件存在，強制重新渲染
      if (this.lineChartComponent && this.lineChartComponent.chart) {
        // 直接更新圖表配置
        this.lineChartComponent.chart.options = this.lineChartOptions;
        
        // 強制重新繪製
        this.lineChartComponent.chart.update('none');
        
        // 再次強制更新
        setTimeout(() => {
          if (this.lineChartComponent && this.lineChartComponent.chart) {
            this.lineChartComponent.chart.update('none');
          }
        }, 50);
      }
    }, 0);
  }
  
  

  // 更新線圖以包含事件標記點
  updateLineChartWithEventMarkers(): void {
    if (!this.demoLineChartData) {
      return;
    }
    
    // 重新生成圖表選項以更新註釋
    this.updateLineChartOptionsForEventMarkers();
    
    // 強制觸發變更檢測
    setTimeout(() => {
      // 這裡可以添加額外的邏輯來確保圖表重新渲染
    }, 0);
  }
  
  // 更新圖表選項以包含事件標記點
  private updateLineChartOptionsForEventMarkers(): void {
    // 獲取當前的事件註釋

    
    // 創建新的圖表選項，包含事件註釋
    const newOptions: any = {
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
            },
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value} 人`;
            }
          }
        },
        legend: {
          display: true,
          position: 'top' as const
        },
        // 添加註釋插件配置
        annotation: {
          
          // 確保註釋插件正確響應變更
          drawTime: 'afterDatasetsDraw',
          // 強制清除緩存
          clip: false,
          // 強制重新計算
          animation: {
            duration: 0
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '時間'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: '累計人數'
          }
        }
      }
    };
    
    // 創建新的選項對象以觸發變更檢測
    this.lineChartOptions = { ...newOptions };
  }
  
  
  // 初始化時間序列圖表
  private initializeTimeSeriesCharts(): void {
    if (!this.data?.time_series_stats) {
      console.warn('⚠️ 沒有時間序列統計數據');
      return;
    }

    // 設置默認時間範圍為一年（因為初始應該載入365天）
    this.selectedTimeRange = '365_days';
    this.currentFilter = '1year'; // 設置對應的篩選器
    // 直接初始化圖表數據，不調用 onTimeRangeChange
    this.processTimeSeriesStats(this.data.time_series_stats);
  }

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
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} 人 (${percentage}%)`;
          }
        }
      }
    },
    // 確保圓餅圖正確顯示比例
    cutout: '60%',
    radius: '90%'
  };



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
    private politicianService: PoliticianService,
    private router: Router,
    private aiAssistantService: AiAssistantService,
    private timeSeriesFilterService: TimeSeriesFilterService
  ) {
    // 註冊註釋插件
    Chart.register(annotationPlugin);
    this.initializeDateRange();

      this.route.paramMap.subscribe(params => {
        this.politicianId = params.get('politicianName') || '';
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
    // 🔥 初始化圖表標題和篩選器同步
    this.syncSelectedTimeRangeWithFilter(this.currentFilter);
    this.updateChartTitle(this.selectedTimeRange);
    
    // 載入政治人物基本信息
    this.politicianService.getPoliticianDetail(this.politicianId).subscribe({
      next: (basicData: any) => {
        
        // 更新基本數據
        this.data = basicData;
        
        // 處理政治人物數據
        this.processPoliticianData(basicData);
        
        // 載入罷免數據（政治人物可能沒有罷免數據，所以保持原樣）
        this.dataService.getRecallList().subscribe(recallList => {
          this.recallData = recallList.find(r => r["姓名"] === this.data.name);
        });
        
        // 檢查是否有時間序列統計數據，如果有則直接使用
        if (basicData.time_series_stats) {
        
          this.initializeTimeSeriesCharts();
        } else {
          // 如果沒有時間序列數據，則從API獲取
          this.loadChartData(365);
        }
        // 🔥 禁用圓餅圖數據載入，因為 processPoliticianData 已經正確設置了圓餅圖數據
        // this.loadPieChartData(365);
      },
      error: (error: any) => {
        console.error('❌ 載入立委基本信息失敗:', error);
      }
    });
  }

  // 新增方法：載入圖表數據
  private loadChartData(days: number): void {

    // 檢查立委是否處於民調封關狀態
    if (this.isLegislatorBlocked(this.politicianId)) {
    
      return;
    }
    
    // 首先檢查是否有本地的 time_series_stats 數據
    if (this.data?.time_series_stats) {
      this.initializeTimeSeriesCharts();
      return;
    }
    
    // 如果沒有本地數據，則從API獲取
    this.politicianService.getPoliticianDetailWithDays(this.politicianId, days).subscribe({
      next: (chartData) => {

        
        // 處理時間序列圖表數據
        if (chartData.time_series) {
          this.demoLineChartData = chartData.time_series;
        }
        
        // 處理詞雲數據
        if (chartData.word_cloud) {
          this.wordCloudData = chartData.word_cloud.map((item: any, index: number) => ({
            text: item.text || item.word || '',
            weight: item.weight || item.count || 0,
            color: this.getWordCloudColor(item.text || item.word || '', index)
          })).filter((item: any) => item.text && item.weight > 0);
        }
        
        // 🔥 優先使用新的 sentiment_analysis 數據
        if (chartData.sentiment_analysis) {
          const { support_count, oppose_count, total_people, time_period } = chartData.sentiment_analysis;
          
          // 更新圓餅圖數據
          this.sentimentChartData = {
            labels: ['支持罷免', '反對罷免'],
            datasets: [{
              data: [support_count, oppose_count],  // [支持, 反對]
              backgroundColor: ['#f87171', '#4f8cff']  // 紅色=支持，藍色=反對
            }]
          };
          
          // 更新統計數據
          this.supportCount = support_count;
          this.opposeCount = oppose_count;
          
        } else {
          // 如果沒有 sentiment_analysis，使用根級別數據作為備用
          this.updateSentimentChart({
            '反對罷免人數': this.data.recall_oppose,
            '支持罷免人數': this.data.recall_support,
            '中性人數': 0
          });
          
          this.opposeCount = this.data.recall_oppose;
          this.supportCount = this.data.recall_support;
          
        }
        
        // 處理情緒分析數據
        if (chartData.emotion_analysis && Object.keys(chartData.emotion_analysis).length > 0) {
         
          
          // 檢查是否為有效的情緒數據（包含 joy, anger 等字段）
          const hasEmotionData = Object.keys(chartData.emotion_analysis).some(key => 
            ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation'].includes(key)
          );
          
          if (hasEmotionData) {
            this.updateEmotionRadarChart(chartData.emotion_analysis);
        
          } else {
            console.log('⚠️ emotion_analysis 數據格式不正確，跳過雷達圖更新');
          }
          
          // 同時更新情感分析圓餅圖
          this.updateSentimentChart(chartData.emotion_analysis);
          
        } else {
          console.log('⚠️ 沒有 emotion_analysis 數據');
        }
        
        // 設置初始篩選為一年
        this.currentFilter = '1year';
        // 不強制設置日期範圍，讓圖表數據決定實際範圍
      },
      error: (error) => {
        console.error('❌ 載入圖表數據失敗:', error);
        
        // 如果API調用失敗，使用根級別數據
        this.updateSentimentChart({
          '反對罷免人數': this.data.recall_oppose,
          '支持罷免人數': this.data.recall_support,
          '中性人數': 0
        });
        
        this.opposeCount = this.data.recall_oppose;
        this.supportCount = this.data.recall_support;
      }
    });
  }

  private loadDateRange(): void {
    // 政治人物可能沒有專門的日期範圍API，使用基本信息
    this.politicianService.getPoliticianDetail(this.politicianId).subscribe({
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

            // 設定初始日期範圍為最近一年（僅作為備用，實際範圍由圖表數據決定）
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

  // 主要方法1：處理政治人物數據
  private processPoliticianData(data: any): void {
    console.log('🔍 處理政治人物數據:', data);
    
    // 1. 情感分析圓餅圖 - 檢查政治人物的數據結構
    let recallSupport = 0;
    let recallOppose = 0;
    
    // 檢查不同的數據結構 - 優先使用 total_stats（與立委頁面一致）
    if (data.total_stats) {
      recallSupport = data.total_stats.negative_count || 0;  // negative = 支持罷免
      recallOppose = data.total_stats.positive_count || 0;   // positive = 反對罷免
    } else if (data.negative !== undefined && data.positive !== undefined) {
      recallSupport = data.negative;  // negative = 支持罷免
      recallOppose = data.positive;   // positive = 反對罷免
    } else if (data.emotion_analysis) {
      recallSupport = data.emotion_analysis.recall_support || data.emotion_analysis.support || 0;
      recallOppose = data.emotion_analysis.recall_oppose || data.emotion_analysis.oppose || 0;
    } else if (data.sentiment_stats) {
      recallSupport = data.sentiment_stats.positive || 0;
      recallOppose = data.sentiment_stats.negative || 0;
    } else if (data.recall_support !== undefined && data.recall_oppose !== undefined) {
      recallSupport = data.recall_support;
      recallOppose = data.recall_oppose;
    }
    
    // 更新計數
    this.supportCount = recallSupport;
    this.opposeCount = recallOppose;
    
    console.log('📊 政治人物情感數據:', { recallSupport, recallOppose });
    
    // 2. 更新圓餅圖數據
    this.sentimentChartData = {
      labels: ['支持罷免', '反對罷免'],
      datasets: [{
        data: [recallSupport, recallOppose],
        backgroundColor: ['#f87171', '#4f8cff'],
        borderColor: ['#ef4444', '#2563eb'],
        borderWidth: 1
      }]
    };
    
    // 3. 處理詞雲數據
    if (data.wordcloud_data && Array.isArray(data.wordcloud_data)) {
      this.wordCloudData = data.wordcloud_data.map((item: any, index: number) => ({
        text: item.text || item.word || '',
        weight: item.weight || item.count || 1,
        color: this.getRandomColor()
      }));
    }
    
    // 4. 處理情感分析雷達圖
    if (data.emotion_analysis) {
      this.updateEmotionRadarChart(data.emotion_analysis);
    }
  }
  
  // 生成隨機顏色
  private getRandomColor(): string {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 主要方法2：處理 legislators 集合數據（保留用於立委）
  private processLegislatorsData(data: any): void {
    
    // 1. 情感分析圓餅圖 - 優先使用emotion_analysis中的recall_support和recall_oppose
    let recallSupport = 0;
    let recallOppose = 0;
    
    // 檢查emotion_analysis中的數據
    if (data.emotion_analysis) {
      recallSupport = data.emotion_analysis.recall_support || 0;
      recallOppose = data.emotion_analysis.recall_oppose || 0;
    }
    
    // 如果emotion_analysis中沒有，則使用根級別的數據
    if (recallSupport === 0 && recallOppose === 0) {
      recallSupport = data.recall_support || 0;
      recallOppose = data.recall_oppose || 0;
    }
    
    // 更新圓餅圖
    if (recallSupport > 0 || recallOppose > 0) {
      this.updateSentimentChart({
        '反對罷免人數': recallOppose,
        '支持罷免人數': recallSupport,
        '中性人數': 0
      });
      
      // 更新統計數據
      this.opposeCount = recallOppose;  // 反對罷免
      this.supportCount = recallSupport;  // 支持罷免
      
    } else {
      console.log('⚠️ 沒有找到有效的recall數據');
    }
    
    // 2. 情緒雷達圖 - 使用emotion_analysis
    if (data.emotion_analysis) {
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
    } else {
    }
    
    // 4. 時間序列統計 - 使用time_series_stats
    if (data.time_series_stats && Object.keys(data.time_series_stats).length > 0) {
      // 直接處理時間序列數據，不區分新舊格式
      this.processTimeSeriesStats(data.time_series_stats);
    } else {
    }
  }
  
  // 簡化方法：處理時間序列統計數據
  private processTimeSeriesStats(timeSeriesStats: any): void {
    // 根據篩選器選擇對應的數據
    const keyMap: { [key: string]: string } = {
      'week': 'recent_7_days_cumulative',
      '2weeks': 'recent_14_days_cumulative',
      'month': 'recent_30_days_cumulative',
      '3months': 'recent_90_days_cumulative',
      '6months': 'recent_180_days_cumulative',
      '1year': 'recent_365_days_cumulative'
    };
    
    const targetKey = keyMap[this.currentFilter] || 'recent_14_days_cumulative';
    const selectedStats = timeSeriesStats[targetKey];
    if (!selectedStats?.stats_points) {
      // 嘗試找到最接近的替代數據
      const fallbackKeys = Object.keys(timeSeriesStats).filter(key => 
        key.includes('cumulative') && key.includes('days')
      );
      
      if (fallbackKeys.length > 0) {
        const fallbackKey = fallbackKeys[0];
        const fallbackStats = timeSeriesStats[fallbackKey];
        if (fallbackStats?.stats_points) {
          this.updateChartFromStats(fallbackStats);
          return;
        }
      }
      
      console.error('❌ 沒有找到任何可用的時間序列數據');
      return;
    }
    this.updateChartFromStats(selectedStats);
    
    // 🔥 禁用圓餅圖更新，因為 processPoliticianData 已經正確設置了圓餅圖數據
    // this.updatePieChartFromTimeSeriesStats(timeSeriesStats);
  }
  
  // 新增方法：從統計數據更新圖表
  private updateChartFromStats(selectedStats: any): void {
    const points = selectedStats.stats_points;
    // 🔥 強制設置最後一個數據點的日期為今天
    if (points.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const lastPoint = points[points.length - 1];
      if (lastPoint && lastPoint.date !== today) {
        lastPoint.date = today;
      }
    }
    
    // 計算資料範圍，用於改善圖表可視性
    const supportData = points.map((p: any) => p.sentiment_counts?.NEGATIVE || p.sentiment_counts?.negative || 0);
    const opposeData = points.map((p: any) => p.sentiment_counts?.POSITIVE || p.sentiment_counts?.positive || 0);
    
    const allData = [...supportData, ...opposeData];
    const minValue = Math.min(...allData);
    const maxValue = Math.max(...allData);
    const dataRange = maxValue - minValue;
    
    // 如果資料範圍太小，設定最小範圍以確保變化可見
    const minRange = Math.max(dataRange, 10); // 最小範圍10
    const yAxisMin = Math.max(0, minValue - minRange * 0.1);
    const yAxisMax = maxValue + minRange * 0.1;
    
    this.demoLineChartData = {
      labels: points.map((p: any) => p.date),
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
    
    // 更新圖表選項以改善可視性
    this.updateLineChartOptionsForVisibility(yAxisMin, yAxisMax, dataRange);
    
    // 政治人物頁面不需要事件標記點
    // this.addEventMarkersToChart();
    
    // 只更新日期範圍，不更新圓餅圖數據
    this.updateDateRangeFromChartData();
  }

  // 新增方法：更新圖表選項以改善可視性
  private updateLineChartOptionsForVisibility(yAxisMin: number, yAxisMax: number, dataRange: number): void {
    // 創建新的圖表選項，避免TypeScript類型錯誤
    const newOptions: any = {
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
            },
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const change = context.dataIndex > 0 ? 
                (value - context.dataset.data[context.dataIndex - 1]) : 0;
              const changeText = change !== 0 ? ` (${change > 0 ? '+' : ''}${change})` : '';
              return `${label}: ${value.toLocaleString()}人${changeText}`;
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
        },
        y: {
          display: true,
          title: {
            display: true,
            text: '累計人數'
          },
          min: yAxisMin,
          max: yAxisMax,
          ticks: {
            stepSize: dataRange < 20 ? 1 : Math.ceil(dataRange / 10),
            callback: function(value: any) {
              return Number(value).toLocaleString();
            }
          }
        }
      }
    };
    
    this.lineChartOptions = newOptions;
  }

  // 新增方法：從時間序列統計更新圓餅圖，確保與時間圖使用相同資料來源
  private updatePieChartFromTimeSeriesStats(timeSeriesStats: any): void {
    // 圓餅圖使用daily資料（該時段內的實際資料總和）
    const dailyKeyMap: { [key: string]: string } = {
      'week': 'recent_7_days_daily',
      '2weeks': 'recent_14_days_daily',
      'month': 'recent_30_days_daily',
      '3months': 'recent_90_days_daily',
      '6months': 'recent_180_days_daily',
      '1year': 'recent_365_days_daily'
    };
    
    const targetKey = dailyKeyMap[this.currentFilter] || 'recent_14_days_daily';
    const selectedStats = timeSeriesStats[targetKey];
    
    if (selectedStats?.totals) {
      // 使用daily資料的totals字段（該時段內的實際資料總和）
      const totalSupport = selectedStats.totals.total_support || 0;
      const totalOppose = selectedStats.totals.total_oppose || 0;
      
      this.sentimentChartData = {
        labels: ['支持罷免', '反對罷免'],
        datasets: [{
          data: [totalSupport, totalOppose],
          backgroundColor: ['#f87171', '#4f8cff']
        }]
      };
      
      // 🔥 禁用統計變數更新，防止覆蓋 processPoliticianData 設置的正確值
      // this.supportCount = totalSupport;
      // this.opposeCount = totalOppose;
      
    } else if (selectedStats?.stats_points && selectedStats.stats_points.length > 0) {
      // 如果沒有totals字段，手動計算該時段內的總和
      let totalSupport = 0;
      let totalOppose = 0;
      
      for (const point of selectedStats.stats_points) {
        if (point.sentiment_counts) {
          totalSupport += point.sentiment_counts.negative || 0;
          totalOppose += point.sentiment_counts.positive || 0;
        }
      }
      
      this.sentimentChartData = {
        labels: ['支持罷免', '反對罷免'],
        datasets: [{
          data: [totalSupport, totalOppose],
          backgroundColor: ['#f87171', '#4f8cff']
        }]
      };
      
      // 🔥 禁用統計變數更新，防止覆蓋 processPoliticianData 設置的正確值
      // this.supportCount = totalSupport;
      // this.opposeCount = totalOppose;
      
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

    this.politicianService.getPoliticianDetailWithDays(this.politicianId, options.days).subscribe({
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
      // 跳過從 crawler_data 載入文字雲，使用 legislators 集合數據
    }

    // 2. 時間序列圖表
    if (shouldUpdateAll || chartTypes.includes('timeseries')) {
      if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
        
        // 直接使用後端回傳的數據，不進行累積計算
        const originalLabels = [...data.time_series.labels];
        const originalDatasets = data.time_series.datasets;
        
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

        // 為今天的數據點添加0值
        const finalDatasets = originalDatasets.map((dataset: any) => {
          if (lastLabel !== todayLabel) {
            return {
              ...dataset,
              data: [...dataset.data, 0] // 今天的數據為0
            };
          }
          return dataset;
        });

        this.demoLineChartData = {
          labels: finalLabels,
          datasets: finalDatasets
        };
        
        
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

    // 優先使用新的 sentiment_analysis 數據
    if (data.sentiment_analysis) {
      const { support_count, oppose_count, total_people, time_period } = data.sentiment_analysis;
      
      // 更新圓餅圖數據
      this.sentimentChartData = {
        labels: ['支持罷免', '反對罷免'],
        datasets: [{
          data: [support_count, oppose_count],  // [支持, 反對]
          backgroundColor: ['#f87171', '#4f8cff']  // 紅色=支持，藍色=反對
        }]
      };

      // 更新統計數據
      this.supportCount = support_count;
      this.opposeCount = oppose_count;

    } else {
      // 如果沒有 sentiment_analysis，使用舊的邏輯
      console.log('⚠️ 沒有 sentiment_analysis 數據，使用舊的邏輯');
      
      this.sentimentChartData = {
        labels: ['支持罷免', '反對罷免'],
        datasets: [{
          data: [this.supportCount, this.opposeCount],  // [支持, 反對]
          backgroundColor: ['#f87171', '#4f8cff']  // 紅色=支持，藍色=反對
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

  // 情緒雷達圖更新方法 - 處理統一的 emotion_analysis 結構
  private updateEmotionRadarChart(emotionData: any): void {
    if (!emotionData) {
      console.log('沒有情緒分析數據');
      return;
    }
    let emotionCounts: { [key: string]: number } = {};
    
    if (emotionData.positive && emotionData.negative) {
      // 舊格式：{ positive: {...}, negative: {...} }
      emotionCounts = { ...emotionData.positive, ...emotionData.negative };
    } else if (typeof emotionData === 'object' && !emotionData.positive && !emotionData.negative) {
      // 新格式：{ joy: 10, anger: 5, ... }
      emotionCounts = emotionData;
    } else {
      console.log('⚠️ 無法識別的情緒分析數據格式');
      return;
    }


    // 檢查是否至少有一個情緒類別有數據
    if (!emotionCounts || Object.keys(emotionCounts).length === 0) {
      console.log('⚠️ 情緒分析數據為空');
      return;
    }

    // 根據標準情緒列表生成數據
    const emotionValues = this.STANDARD_EMOTIONS.map(emotion => emotionCounts[emotion] || 0);


    // 檢查是否有有效數據
    const allZeroes = emotionValues.every(val => val === 0);
    if (allZeroes) {
      console.log('⚠️ 所有情緒分析數據都為0');
      return;
    }

    // 計算動態範圍，避免點點擠在一起
    const maxValue = Math.max(...emotionValues);
    let suggestedMax = Math.max(maxValue * 1.5, 50);
    if (maxValue < 10) suggestedMax = 100;

    // 更新雷達圖數據 - 只顯示一組數據
    this.radarChartData = {
      labels: this.STANDARD_EMOTIONS,
      datasets: [
        {
          label: '情緒分析',
          data: emotionValues,
          backgroundColor: 'rgba(79, 140, 255, 0.2)',
          borderColor: '#4f8cff',
          pointBackgroundColor: '#4f8cff',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#4f8cff',
          borderWidth: 2
        }
      ]
    };

  }



  // 統一的情感圖表更新方法 - 修正版本
  private updateSentimentChart(sentimentData: any): void {
    
    if (!sentimentData) {
      console.log('沒有情感分析數據');
      return;
    }

    // 檢查是否為罷免相關的數據格式
    if (sentimentData['反對罷免人數'] !== undefined && sentimentData['支持罷免人數'] !== undefined) {
      // 罷免數據格式：直接使用
      this.opposeCount = sentimentData['反對罷免人數'] || 0;
      this.supportCount = sentimentData['支持罷免人數'] || 0;
    } else if (sentimentData.positive && sentimentData.negative) {
      // 舊格式：{positive: {...}, negative: {...}}
      const positiveTotal = Object.values(sentimentData.positive).reduce((sum: number, val: any) => sum + (val || 0), 0);
      const negativeTotal = Object.values(sentimentData.negative).reduce((sum: number, val: any) => sum + (val || 0), 0);
      
      this.opposeCount = positiveTotal;
      this.supportCount = negativeTotal;
    } else if (typeof sentimentData === 'object' && !sentimentData.positive && !sentimentData.negative) {
      // 新格式：{ joy: 10, anger: 5, ... }
      const totalEmotions = Object.values(sentimentData).reduce((sum: number, val: any) => sum + (val || 0), 0);
      
      // 簡單分配：一半為正面，一半為負面（或者根據實際業務邏輯調整）
      this.opposeCount = Math.floor(totalEmotions / 2);
      this.supportCount = totalEmotions - this.opposeCount;
    } else {
      console.log('無法識別的情感分析數據格式');
      return;
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

  // 修正百分比計算 - opposeCount=反對罷免，supportCount=支持罷免
  getSupportPercentage(): string {
    const total = this.opposeCount + this.supportCount;
    if (total === 0) return '0.0';
    return ((this.supportCount / total) * 100).toFixed(1);  // supportCount = 支持罷免
  }

  getOpposePercentage(): string {
    const total = this.opposeCount + this.supportCount;
    if (total === 0) return '0.0';
    return ((this.opposeCount / total) * 100).toFixed(1);  // opposeCount = 反對罷免
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
    const total = this.opposeCount + this.supportCount;
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

    // 🔥 同步 selectedTimeRange 和更新圖表標題
    this.syncSelectedTimeRangeWithFilter(period);
    this.updateChartTitle(this.selectedTimeRange);

    // 顯示加載狀態
    this.isLoadingTimeData = true;

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


    // 首先嘗試使用本地的 time_series_stats 數據
    if (this.data?.time_series_stats) {
      this.processTimeSeriesStats(this.data.time_series_stats);
      
      // 🔥 調用圓餅圖 API 更新數據，根據時間篩選更新圓餅圖
      this.updatePieChartFromAPI();
      
      // 根據實際圖表數據更新日期範圍
      this.updateDateRangeFromChartData();
      
      this.isLoadingTimeData = false;
      return;
    }

    // 如果沒有本地數據，則從API獲取
    this.politicianService.getPoliticianDetailWithDays(this.politicianId, days).subscribe({
      next: (data) => {
        if (data) {
          // 處理時間序列圖表數據
          if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
            this.demoLineChartData = data.time_series;
            
            // 根據時間序列數據更新日期範圍
            this.updateDateRangeFromChartData();
          }
          
          // 處理詞雲數據
          if (data.word_cloud && data.word_cloud.length > 0) {
            this.wordCloudData = data.word_cloud.map((item: any, index: number) => ({
              text: item.text || item.word || '',
              weight: item.weight || item.count || 0,
              color: this.getWordCloudColor(item.text || item.word || '', index)
            })).filter((item: any) => item.text && item.weight > 0);
          }
          
          // 🔥 優先使用新的 sentiment_analysis 數據
          if (data.sentiment_analysis) {
            const { support_count, oppose_count, total_people, time_period } = data.sentiment_analysis;
            
            // 更新圓餅圖數據
            this.sentimentChartData = {
              labels: ['支持罷免', '反對罷免'],
              datasets: [{
                data: [support_count, oppose_count],  // [支持, 反對]
                backgroundColor: ['#f87171', '#4f8cff']  // 紅色=支持，藍色=反對
              }]
            };
            
            // 更新統計數據
            this.supportCount = support_count;
            this.opposeCount = oppose_count;
            
          } else {
            // 如果沒有 sentiment_analysis，使用根級別數據作為備用
            this.updateSentimentChart({
              '反對罷免人數': this.data.recall_oppose,
              '支持罷免人數': this.data.recall_support,
              '中性人數': 0
            });
            
            // 更新統計數據 - 確保與updateSentimentChart中的邏輯一致
            this.opposeCount = this.data.recall_oppose;  // 反對罷免
            this.supportCount = this.data.recall_support;  // 支持罷免
            
          }
          
          // 處理情緒分析數據
          if (data.emotion_analysis) {
            this.updateEmotionRadarChart(data.emotion_analysis);
          }
          
          this.isLoadingTimeData = false;
        } else {
          console.warn('⚠️ 沒有收到數據');
          this.isLoadingTimeData = false;
        }
      },
      error: (error) => {
        console.error('❌ 載入數據失敗:', error);
        this.isLoadingTimeData = false;
      }
    });
  }



  // 簡化方法：根據篩選器計算正確的日期範圍
  private updateDateRangeFromChartData(): void {
    // 根據 currentFilter 計算正確的時間範圍，而不是根據圖表 labels
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;
    
    // 根據篩選器計算開始日期
    switch (this.currentFilter) {
      case 'week':
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); // 7天前
        break;
      case '2weeks':
        startDate = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000); // 14天前
        break;
      case 'month':
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); // 30天前
        break;
      case '3months':
        startDate = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000); // 90天前
        break;
      case '6months':
        startDate = new Date(today.getTime() - 179 * 24 * 60 * 60 * 1000); // 180天前
        break;
      case '1year':
        startDate = new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000); // 365天前
        break;
      default:
        startDate = new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000); // 默認365天
    }
    
    this.startDate = startDate.toISOString().split('T')[0];
    this.endDate = endDate.toISOString().split('T')[0];
    
    console.log('📅 時間範圍更新:', {
      currentFilter: this.currentFilter,
      startDate: this.startDate,
      endDate: this.endDate,
      daysDiff: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    });
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
          // 可以在這裡添加一些用戶反饋，比如顯示一個小提示
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

  // 新增方法：日期範圍變更處理
  onDateRangeChange(): void {
    
    if (this.startDate && this.endDate) {
      // 計算天數差異
      const days = this.getDaysDifference();
      
      // 重新載入數據
      this.loadChartData(days);
    }
  }

  // 新增方法：計算日期差異
  getDaysDifference(): number {
    if (!this.startDate || !this.endDate) {
      return 0;
    }
    
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // 檢查立委是否被封關
  isLegislatorBlocked(name: string): boolean {
    return this.BLOCKED_LEGISLATORS.includes(name);
  }

  // 時間範圍篩選方法
  onTimeRangeChange(): void {
    if (!this.data?.time_series_stats) {
      return;
    }

    // 🔥 同步 selectedTimeRange 和 currentFilter
    this.syncSelectedTimeRangeWithFilter(this.selectedTimeRange);

    // 🔥 更新圖表標題
    this.updateChartTitle(this.selectedTimeRange);

    // 🔥 調用圓餅圖 API 更新數據，根據時間篩選更新圓餅圖
    this.updatePieChartFromAPI();

    // 政治人物頁面不需要事件標記點
    // this.loadEventMarkers();

    // 處理時間序列統計數據
    this.processTimeSeriesStats(this.data.time_series_stats);
  }
  
  // 🔥 新增：載入圓餅圖數據
  private loadPieChartData(days: number): void {
    
    this.politicianService.getPoliticianDetailWithDays(this.politicianId, days).subscribe({
      next: (pieData: any) => {
        
        // 更新圓餅圖數據
        this.sentimentChartData = {
          labels: ['支持罷免', '反對罷免'],
          datasets: [{
            data: [pieData.support_count, pieData.oppose_count],  // [支持, 反對]
            backgroundColor: ['#f87171', '#4f8cff']  // 紅色=支持，藍色=反對
          }]
        };
        
        // 更新統計數據
        this.supportCount = pieData.support_count;
        this.opposeCount = pieData.oppose_count;
        
      },
      error: (error: any) => {
        console.error('❌ 圓餅圖API調用失敗:', error);
      }
    });
  }

  // 🔥 新增：從 API 更新圓餅圖數據
  private updatePieChartFromAPI(): void {
    // 根據當前篩選器決定天數
    let days = 365; // 預設365天
    
    switch (this.currentFilter) {
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
      default:
        days = 365;
    }
    
    
    // 調用政治人物數據 API
    this.politicianService.getPoliticianDetailWithDays(this.politicianId, days).subscribe({
      next: (pieData: any) => {
        console.log('🔄 更新圓餅圖數據，天數:', days, '數據:', pieData);
        
        // 使用與 processPoliticianData 相同的數據處理邏輯
        let recallSupport = 0;
        let recallOppose = 0;

        // 檢查不同的數據結構 - 優先使用 sentiment_analysis（API 返回的數據）
        if (pieData.sentiment_analysis) {
          recallSupport = pieData.sentiment_analysis.support_count || 0;  // support_count = 支持罷免
          recallOppose = pieData.sentiment_analysis.oppose_count || 0;   // oppose_count = 反對罷免
        } else if (pieData.total_stats) {
          recallSupport = pieData.total_stats.negative_count || 0;  // negative = 支持罷免
          recallOppose = pieData.total_stats.positive_count || 0;   // positive = 反對罷免
        } else if (pieData.negative !== undefined && pieData.positive !== undefined) {
          recallSupport = pieData.negative;  // negative = 支持罷免
          recallOppose = pieData.positive;   // positive = 反對罷免
        } else if (pieData.emotion_analysis) {
          recallSupport = pieData.emotion_analysis.recall_support || pieData.emotion_analysis.support || 0;
          recallOppose = pieData.emotion_analysis.recall_oppose || pieData.emotion_analysis.oppose || 0;
        } else if (pieData.sentiment_stats) {
          recallSupport = pieData.sentiment_stats.positive || 0;
          recallOppose = pieData.sentiment_stats.negative || 0;
        } else if (pieData.recall_support !== undefined && pieData.recall_oppose !== undefined) {
          recallSupport = pieData.recall_support;
          recallOppose = pieData.recall_oppose;
        }

        console.log('📊 圓餅圖更新數據:', { recallSupport, recallOppose });

        // 更新圓餅圖數據
        this.sentimentChartData = {
          labels: ['支持罷免', '反對罷免'],
          datasets: [{
            data: [recallSupport, recallOppose],  // [支持, 反對]
            backgroundColor: ['#f87171', '#4f8cff'],  // 紅色=支持，藍色=反對
            borderColor: ['#ef4444', '#2563eb'],
            borderWidth: 1
          }]
        };
        
        // 更新統計數據
        this.supportCount = recallSupport;
        this.opposeCount = recallOppose;
        
      },
      error: (error: any) => {
        console.error('❌ 圓餅圖API調用失敗:', error);
      }
    });
  }
  
  
  
  
  
  

}