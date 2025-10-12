import { Component, ViewChild } from '@angular/core';
import {  Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { AiAssistantService } from '../../../services/ai-assistant.service';
import { TimeSeriesFilterService, FilteredTimeSeriesData } from '../../../services/time-series-filter.service';
import { EventMarker, getPoliticianEvents, filterEventsByDays } from './legislators_event';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';

import { IconModule } from '@coreui/icons-angular';

import { ChartjsComponent } from '@coreui/angular-chartjs';
import { Chart, Tooltip, type ChartData } from 'chart.js'; // 確保導入 ChartData 類型
import { AnnotationOptions, LabelPosition } from 'chartjs-plugin-annotation';
import annotationPlugin from 'chartjs-plugin-annotation';
import { TagCloudComponent, CloudData, CloudOptions } from 'angular-tag-cloud-module';

@Component({
  selector: 'app-legislators-detail',
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
  templateUrl: './legislators-detail.component.html',
  styleUrl: './legislators-detail.component.scss'
})
export class LegislatorsDetailComponent {
  politicianId = '';
  data: any = null;
  recallData: any = null;
  opposeCount = 0;  // 反對罷免人數
  supportCount = 0; // 支持罷免人數

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
  selectedTimeRange: string = '30_days';
  filteredTimeSeriesData: FilteredTimeSeriesData | null = null;
  availableIntervals: string[] = [];
  
  // 事件標記點相關屬性
  eventMarkers: EventMarker[] = [];
  showEventMarkers: boolean = true;
  
  @ViewChild('lineChart') lineChartComponent!: ChartjsComponent;

  // 獲取可用的時間間隔
  getAvailableIntervals(): void {
    if (this.data?.time_series_stats) {
      this.availableIntervals = this.timeSeriesFilterService.getAvailableIntervals(this.data.time_series_stats);
    } else {
      console.warn('⚠️ getAvailableIntervals: 沒有時間序列統計數據');
    }
  }
  
  // 載入事件標記點
  loadEventMarkers(): void {
    if (this.data?.name) {
      // 獲取立委的所有事件標記點（顯示最近一年的所有事件）
      this.eventMarkers = getPoliticianEvents(this.data.name);
    } else {
      this.eventMarkers = [];;
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
  
  // 切換事件標記點顯示
  toggleEventMarkers(): void {
    this.showEventMarkers = !this.showEventMarkers;
    this.updateLineChartWithEventMarkers();
  }
  
  // 生成事件註釋
  getEventAnnotations(): any {
    if (!this.showEventMarkers || !this.eventMarkers.length || !this.demoLineChartData) {
      return {};
    }

    const annotations: any = {};
    const positionMap = new Map<string, number>(); // 記錄每個日期位置的使用情況

    this.eventMarkers.forEach((marker, index) => {
      // 尋找最接近的日期
      let bestMatchIndex = -1;
      let closestDistance = Infinity;

      if (this.demoLineChartData.labels) {
        this.demoLineChartData.labels.forEach((label: any, labelIndex: number) => {
          const eventDate = new Date(marker.date);
          const labelDate = new Date(label);

          const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          const labelDateOnly = new Date(labelDate.getFullYear(), labelDate.getMonth(), labelDate.getDate());

          const distance = Math.abs(eventDateOnly.getTime() - labelDateOnly.getTime());
          if (distance < closestDistance) {
            closestDistance = distance;
            bestMatchIndex = labelIndex;
          }
        });
      }

      // 如果找到匹配的日期（距離小於30天），則添加註釋
      if (bestMatchIndex >= 0 && closestDistance < 30 * 24 * 60 * 60 * 1000) {
        const annotationId = `event_${index}`;
        const xValue = this.demoLineChartData.labels![bestMatchIndex];

        // 計算Y軸位置
        let yValue = 0;
        if (this.demoLineChartData.datasets && this.demoLineChartData.datasets.length >= 2) {
          const supportData = this.demoLineChartData.datasets[0].data as number[];
          const opposeData = this.demoLineChartData.datasets[1].data as number[];
          if (supportData && opposeData &&
              supportData[bestMatchIndex] !== undefined &&
              opposeData[bestMatchIndex] !== undefined) {
            yValue = Math.max(supportData[bestMatchIndex], opposeData[bestMatchIndex]);
          }
        }

        // 檢查是否有重疊，如果有則錯開位置
        const positionKey = String(xValue);
        let offsetY = 0;
        if (positionMap.has(positionKey)) {
          offsetY = positionMap.get(positionKey)! +25; // 每次錯開200像素
        }
        positionMap.set(positionKey, offsetY + 25);

        // 計算最終Y位置
        const finalYValue = yValue + offsetY;
        
        annotations[annotationId] = {
          type: 'line',
          mode: 'vertical',
          scaleID: 'x',
          value: xValue,
          borderColor: marker.color || '#FF6B6B',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            enabled: true,
            content: `${marker.icon} ${marker.title}`,
            position: 'start',
            backgroundColor: marker.color || '#FF6B6B',
            color: 'white',
            font: {
              size: 10,
              weight: 'bold'
            },
            padding: 4,
            cornerRadius: 4,
            display: true,
            rotation: -45,
            yAdjust: offsetY // 添加Y軸偏移
          }
        } as any;
      }
    });
    
    return annotations;
  }

  // 更新線圖以包含事件標記點
  updateLineChartWithEventMarkers(): void {
    if (!this.demoLineChartData) {
      console.log('📌 沒有圖表數據');
      return;
    }
    // 重新生成圖表選項以更新註釋
    this.updateLineChartOptionsForEventMarkers();
  }
  
  // 更新圖表選項以包含事件標記點
  private updateLineChartOptionsForEventMarkers(): void {
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
          annotations: this.getEventAnnotations()
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
    
    this.lineChartOptions = newOptions;
  }
  
  // 添加事件標記點到圖表
  private addEventMarkersToChart(): void {
    if (!this.showEventMarkers || !this.eventMarkers.length || !this.demoLineChartData) {
      return;
    }
    
    // 使用註釋方式添加事件標記點
    this.updateLineChartOptionsForEventMarkers();
  }

  // 初始化時間序列圖表
  private initializeTimeSeriesCharts(): void {
    if (!this.data?.time_series_stats) {
      console.warn('⚠️ 沒有時間序列統計數據');
      return;
    }
    
    // 載入事件標記點
    this.loadEventMarkers();
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
            
            // 檢查是否為事件標記點
            if (label.includes('💰') || label.includes('📊') || label.includes('🎉') || 
                label.includes('⚠️') || label.includes('🚶') || label.includes('📝') || 
                label.includes('✅') || label.includes('🗳️') || label.includes('🏛️') || 
                label.includes('🎖️')) {
              // 從原始數據中獲取事件信息
              const rawData = context.raw;
              if (rawData && rawData.title) {
                return [`事件: ${rawData.title}`, `日期: ${rawData.x}`, `描述: ${rawData.description || ''}`];
              }
              return [`事件: ${label.replace(/[💰📊🎉⚠️🚶📝✅🗳️🏛️🎖️]/g, '').trim()}`, `日期: ${context.label}`];
            }
            
            // 檢查是否為事件標記線
            if (label.includes('事件標記線')) {
              return ''; // 不顯示垂直線的tooltip
            }
            
            // 普通數據點
            return `${label}: ${value} 人`;
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
      },
      // 添加註釋插件配置
      annotation: {
        annotations: this.getEventAnnotations()
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
    private aiAssistantService: AiAssistantService,
    private timeSeriesFilterService: TimeSeriesFilterService
  ) {
    // 註冊註釋插件
    Chart.register(annotationPlugin);
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
    // 載入立委基本信息
    this.dataService.getLegislatorDetail(this.politicianId).subscribe({
      next: (basicData: any) => {
        
        // 更新基本數據
        this.data = basicData;
        
        // 處理根級別的數據（包括recall_support, recall_oppose等）
        this.processLegislatorsData(basicData);
        
        // 載入罷免數據
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
        this.loadPieChartData(365);
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
    this.dataService.getLegislatorUnifiedData(this.politicianId, {
      days: days,
      includePieChart: true,
      includeTimeSeries: true,
      includeWordCloud: true,
      includeEmotion: true
    }).subscribe({
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
          
          console.log(`✅ 使用新的 sentiment_analysis 數據:`, {
            support_count,
            oppose_count,
            total_people,
            time_period
          });
        } else {
          // 如果沒有 sentiment_analysis，使用根級別數據作為備用
          this.updateSentimentChart({
            '反對罷免人數': this.data.recall_oppose,
            '支持罷免人數': this.data.recall_support,
            '中性人數': 0
          });
          
          this.opposeCount = this.data.recall_oppose;
          this.supportCount = this.data.recall_support;
          
          console.log('⚠️ 沒有 sentiment_analysis 數據，使用根級別數據:', { 
            recall_support: this.data.recall_support, 
            recall_oppose: this.data.recall_oppose 
          });
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

  // 主要方法1：處理 legislators 集合數據
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
      console.log('legislators 中沒有文字雲數據');
    }
    
    // 4. 時間序列統計 - 使用time_series_stats
    if (data.time_series_stats && Object.keys(data.time_series_stats).length > 0) {
      // 直接處理時間序列數據，不區分新舊格式
      this.processTimeSeriesStats(data.time_series_stats);
    } else {
      console.log('legislators 中沒有時間序列數據');
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
    
    // 同時更新圓餅圖使用相同的資料來源，確保一致性
    this.updatePieChartFromTimeSeriesStats(timeSeriesStats);
  }
  
  // 新增方法：從統計數據更新圖表
  private updateChartFromStats(selectedStats: any): void {
    const points = selectedStats.stats_points;
    
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
    
    // 添加事件標記點
    this.addEventMarkersToChart();
    
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
      
      this.supportCount = totalSupport;
      this.opposeCount = totalOppose;
      
      console.log(`✅ 圓餅圖使用 ${targetKey} 資料: 支持=${totalSupport}, 反對=${totalOppose}`);
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
      
      this.supportCount = totalSupport;
      this.opposeCount = totalOppose;
      
      console.log(`✅ 圓餅圖手動計算 ${targetKey} 總和: 支持=${totalSupport}, 反對=${totalOppose}`);
    } else {
      console.log(`⚠️ 沒有找到 ${targetKey} 的daily資料，保持現有圓餅圖數據`);
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

      console.log(`✅ 使用新的 sentiment_analysis 數據更新圓餅圖:`, {
        support_count,
        oppose_count,
        total_people,
        time_period,
        chartData: this.sentimentChartData.datasets[0].data
      });
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

    // 調試：檢查圓餅圖數據
    console.log('🔍 圓餅圖數據設置:', {
      positiveCount: this.supportCount,
      negativeCount: this.opposeCount,
      chartData: this.sentimentChartData.datasets[0].data,
      total: this.supportCount + this.opposeCount
    });

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

    console.log(`🔍 映射的天數: ${days}`);

    // 首先嘗試使用本地的 time_series_stats 數據
    if (this.data?.time_series_stats) {
      this.processTimeSeriesStats(this.data.time_series_stats);
      
      // 🔥 調用圓餅圖 API 更新數據
      this.updatePieChartFromAPI();
      
      // 根據實際圖表數據更新日期範圍
      this.updateDateRangeFromChartData();
      
      this.isLoadingTimeData = false;
      return;
    }

    console.log(`🔍 沒有本地數據，從API獲取`);
    // 如果沒有本地數據，則從API獲取
    this.dataService.getLegislatorUnifiedData(this.politicianId, {
      days: days,
      includePieChart: true,
      includeTimeSeries: true,
      includeWordCloud: true,
      includeEmotion: true
    }).subscribe({
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
            
            console.log(`✅ 使用新的 sentiment_analysis 數據:`, {
              support_count,
              oppose_count,
              total_people,
              time_period
            });
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
            
            console.log('⚠️ 沒有 sentiment_analysis 數據，使用根級別數據:', { 
              recall_support: this.data.recall_support, 
              recall_oppose: this.data.recall_oppose 
            });
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



  // 簡化方法：根據圖表數據更新日期範圍
  private updateDateRangeFromChartData(): void {
    if (!this.demoLineChartData?.labels?.length) return;
    
    const labels = this.demoLineChartData.labels as string[];
    const firstLabel = labels[0];
    const lastLabel = labels[labels.length - 1];
    
    try {
      // 簡化日期解析，主要處理 YYYY-MM-DD 格式
      let firstDate: Date;
      let lastDate: Date;
      
      if (firstLabel.includes('-')) {
        firstDate = new Date(firstLabel);
        lastDate = new Date(lastLabel);
      } else if (firstLabel.includes('/')) {
        firstDate = new Date(firstLabel.replace(/\//g, '-'));
        lastDate = new Date(lastLabel.replace(/\//g, '-'));
      } else {
        return; // 無法解析的格式直接返回
      }
      
      if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
        this.startDate = firstDate.toISOString().split('T')[0];
        this.endDate = lastDate.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('⚠️ 日期解析失敗:', e);
    }
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
    console.log('📅 日期範圍變更:', this.startDate, '到', this.endDate);
    
    if (this.startDate && this.endDate) {
      // 計算天數差異
      const days = this.getDaysDifference();
      console.log(`📅 更新日期範圍: ${this.startDate} 到 ${this.endDate} (${days}天)`);
      
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

    // 🔥 調用新的圓餅圖 API 更新數據
    this.updatePieChartFromAPI();

    // 重新載入事件標記點
    this.loadEventMarkers();

    // 直接使用 currentFilter 處理時間範圍
    if (this.currentFilter && this.currentFilter !== 'all') {
      this.processTimeSeriesStats(this.data.time_series_stats);
      return;
    }

    // 如果沒有 currentFilter，使用預設的一年數據
    this.currentFilter = '1year';
    this.processTimeSeriesStats(this.data.time_series_stats);
  }
  
  // 🔥 新增：載入圓餅圖數據
  private loadPieChartData(days: number): void {
    
    this.dataService.getLegislatorPieChart(this.politicianId, days).subscribe({
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
        
        console.log(`🎯 圓餅圖載入完成: 支持=${pieData.support_count}, 反對=${pieData.oppose_count}, 總計=${pieData.total_people}人`);
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
    
    console.log(`🔄 調用圓餅圖API: ${days}天`);
    
    // 調用新的圓餅圖 API
    this.dataService.getLegislatorPieChart(this.politicianId, days).subscribe({
      next: (pieData: any) => {
        console.log('✅ 圓餅圖API返回數據:', pieData);
        
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
        
        console.log(`🎯 圓餅圖更新完成: 支持=${pieData.support_count}, 反對=${pieData.oppose_count}, 總計=${pieData.total_people}人`);
      },
      error: (error: any) => {
        console.error('❌ 圓餅圖API調用失敗:', error);
      }
    });
  }




}