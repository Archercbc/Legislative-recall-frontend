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
  positiveCount = 0;  // positive = 支持（反對罷免）
  negativeCount = 0;  // negative = 反對（支持罷免）

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

  // 罷免投票日期對應表
  // 第一波投票：2025年7月26日
  // 第二波投票：2025年8月23日
  private readonly RECALL_VOTE_DATES: { [key: string]: string } = {
    // 第一波投票（2025-07-26）
    '羅智強': '2025-07-26',
    '徐巧芯': '2025-07-26',
    '賴士葆': '2025-07-26',
    '王鴻薇': '2025-07-26',
    '李彥秀': '2025-07-26',
    '洪孟楷': '2025-07-26',
    '張智倫': '2025-07-26',
    '林德福': '2025-07-26',
    '廖先翔': '2025-07-26',
    '葉元之': '2025-07-26',
    '牛煦庭': '2025-07-26',
    '涂權吉': '2025-07-26',
    '魯明哲': '2025-07-26',
    '萬美玲': '2025-07-26',
    '呂玉玲': '2025-07-26',
    '邱若華': '2025-07-26',
    '徐欣瑩': '2025-07-26',
    '鄭正鈐': '2025-07-26',
    '廖偉翔': '2025-07-26',
    '黃健豪': '2025-07-26',
    '羅廷瑋': '2025-07-26',
    '丁學忠': '2025-07-26',
    '傅崐萁': '2025-07-26',
    '黃建賓': '2025-07-26',
    // 第二波投票（2025-08-23）
    '羅明才': '2025-08-23',
    '楊瓊瓔': '2025-08-23',
    '江啟臣': '2025-08-23',
    '顏寬恒': '2025-08-23',
    '馬文君': '2025-08-23',
    '游顥': '2025-08-23',
    '林思銘': '2025-08-23'
  };

  // 時間範圍篩選相關屬性
  selectedTimeRange: string = '30_days';
  filteredTimeSeriesData: FilteredTimeSeriesData | null = null;
  availableIntervals: string[] = [];
  
  // 事件標記點相關屬性
  eventMarkers: EventMarker[] = [];
  showEventMarkers: boolean = true;
  chartTitle: string = '近一年罷免支持度累計趨勢';
  
  @ViewChild('lineChart') lineChartComponent!: ChartjsComponent;

  // 獲取可用的時間間隔
  getAvailableIntervals(): void {
    if (this.data?.time_series_stats) {
      this.availableIntervals = this.timeSeriesFilterService.getAvailableIntervals(this.data.time_series_stats);
    }
  }
  
  // 載入事件標記點
  loadEventMarkers(): void {
    if (this.data?.name) {
      // 獲取立委的所有事件標記點（顯示最近一年的所有事件）
      this.eventMarkers = getPoliticianEvents(this.data.name);
    } else {
      this.eventMarkers = [];
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
  
  // 生成事件註釋
  getEventAnnotations(): any {
    // 如果關閉事件標記，返回空對象
    if (!this.showEventMarkers) {
      return {};
    }
    
    // 如果沒有事件標記數據或圖表數據，返回空對象
    if (!this.eventMarkers.length || !this.demoLineChartData) {
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

      // 如果找到匹配的日期（距離小於90天），則添加註釋（放寬匹配條件）
      if (bestMatchIndex >= 0 && closestDistance < 90 * 24 * 60 * 60 * 1000) {
        const annotationId = `event_${index}`;
        const xValue = this.demoLineChartData.labels![bestMatchIndex];

        // 計算Y軸位置
        let yValue = 0;
        if (this.demoLineChartData.datasets && this.demoLineChartData.datasets.length >= 2) {
          const opposeRecallData = this.demoLineChartData.datasets[0].data as number[];  // positive = 支持（反對罷免）
          const supportRecallData = this.demoLineChartData.datasets[1].data as number[];  // negative = 反對（支持罷免）
          if (opposeRecallData && supportRecallData &&
              opposeRecallData[bestMatchIndex] !== undefined &&
              supportRecallData[bestMatchIndex] !== undefined) {
            yValue = Math.max(opposeRecallData[bestMatchIndex], supportRecallData[bestMatchIndex]);
          }
        }

        // 檢查是否有重疊，如果有則錯開位置
        const positionKey = String(xValue);
        let offsetY = 0;
        if (positionMap.has(positionKey)) {
          offsetY = positionMap.get(positionKey)! + 60; // 增加錯開距離到60像素
        }
        positionMap.set(positionKey, offsetY + 60);

        // 計算最終Y位置，確保不會超出圖表範圍
        const maxY = Math.max(...this.demoLineChartData.datasets.flatMap(d => d.data as number[]));
        const minY = Math.min(...this.demoLineChartData.datasets.flatMap(d => d.data as number[]));
        const chartHeight = maxY - minY;
        
        // 🔥 更智能的Y位置計算，確保標籤不會超出邊界
        let finalYValue = yValue + offsetY;
        
        // 如果標籤會超出上邊界，向下調整
        if (finalYValue > maxY * 0.9) {
          finalYValue = maxY * 0.7 - (offsetY / 2);
        }
        
        // 如果標籤會超出下邊界，向上調整
        if (finalYValue < minY * 1.1) {
          finalYValue = minY * 1.3 + (offsetY / 2);
        }
        
        // 最終邊界檢查
        finalYValue = Math.max(minY * 0.8, Math.min(maxY * 1.2, finalYValue));
        
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
              size: 11,
              weight: 'bold'
            },
            padding: 6,
            cornerRadius: 6,
            display: true,
            rotation: -40,
            yAdjust: offsetY, // 添加Y軸偏移
            xAdjust: 0,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1
          }
        } as any;
      }
    });
    
    return annotations;
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
    const currentAnnotations = this.getEventAnnotations();
    
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
          annotations: currentAnnotations,
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
      return;
    }
    
    // 載入事件標記點
    this.loadEventMarkers();
    // 設置默認時間範圍為一年（因為初始應該載入365天）
    this.selectedTimeRange = '365_days';
    this.currentFilter = '1year'; // 設置對應的篩選器
    
    // 🔥 立即更新日期範圍顯示
    this.updateDateRangeForPeriod('1year');
    
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
      this.politicianId = params.get('legislatorId') || '';
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
    
    // 載入立委基本信息
    this.dataService.getLegislatorDetail(this.politicianId).subscribe({
      next: (basicData: any) => {
        
        // 更新基本數據
        this.data = basicData;
        
        // 處理根級別的數據（包括positive, negative等）
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
    this.dataService.getLegislatorUnifiedData(this.politicianId).subscribe({
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
          // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
          const positive_count = chartData.sentiment_analysis.positive_count || chartData.sentiment_analysis.positive || 0;  // positive = 支持
          const negative_count = chartData.sentiment_analysis.negative_count || chartData.sentiment_analysis.negative || 0;  // negative = 反對
          const total_people = chartData.sentiment_analysis.total_people || chartData.sentiment_analysis.total || (positive_count + negative_count);
          const time_period = chartData.sentiment_analysis.time_period;
          
          // 更新圓餅圖數據（罷免場景：支持=反對罷免=positive，反對=支持罷免=negative）
          this.sentimentChartData = {
            labels: ['反對罷免', '支持罷免'],
            datasets: [{
              data: [positive_count, negative_count],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
              backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
            }]
          };
          
          // 更新統計數據
          this.positiveCount = positive_count;  // positive = 支持（反對罷免）
          this.negativeCount = negative_count;  // negative = 反對（支持罷免）
          
        } else {
          // 如果沒有 sentiment_analysis，使用根級別數據作為備用
          // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
          this.positiveCount = this.data.positive || 0;  // positive = 支持（反對罷免）
          this.negativeCount = this.data.negative || 0;  // negative = 反對（支持罷免）
          
          this.updateSentimentChart({
            '反對罷免人數': this.data.positive || 0,  // positive = 支持（反對罷免）
            '支持罷免人數': this.data.negative || 0,  // negative = 反對（支持罷免）
            '中性人數': 0
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
        
          }
          
          // 同時更新情感分析圓餅圖
          this.updateSentimentChart(chartData.emotion_analysis);
        }
        
        // 設置初始篩選為一年
        this.currentFilter = '1year';
        // 不強制設置日期範圍，讓圖表數據決定實際範圍
      },
      error: (error) => {
        // 如果API調用失敗，使用根級別數據
        // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
        this.positiveCount = this.data.positive || 0;  // positive = 支持（反對罷免）
        this.negativeCount = this.data.negative || 0;  // negative = 反對（支持罷免）
        
        this.updateSentimentChart({
          '反對罷免人數': this.data.positive || 0,  // positive = 支持（反對罷免）
          '支持罷免人數': this.data.negative || 0,  // negative = 反對（支持罷免）
          '中性人數': 0
        });
      }
    });
  }

  private loadDateRange(): void {
    // 使用統一API獲取日期範圍信息
    this.dataService.getLegislatorUnifiedData(this.politicianId).subscribe({
      next: (data) => {
        // 從時間序列數據中提取日期範圍
        if (data.time_series_stats && data.time_series_stats.recent_365_days_cumulative) {
          const timeSeriesData = data.time_series_stats.recent_365_days_cumulative;
          if (timeSeriesData.stats_points && timeSeriesData.stats_points.length > 0) {
            const points = timeSeriesData.stats_points;
            const startDate = points[0].date;
            const endDate = points[points.length - 1].date;
            
            this.minDate = startDate;
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
          }
        }
      },
      error: (error) => {
      }
    });
  }

  // ===== 主要方法 =====

  // 主要方法1：處理 legislators 集合數據
  private processLegislatorsData(data: any): void {
    
    // 1. 情感分析圓餅圖 - 使用統一的 positive/negative 欄位
    // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
    let positiveCount = 0;  // positive = 支持（反對罷免）
    let negativeCount = 0;  // negative = 反對（支持罷免）
    
    // 優先使用簡化的 stats 欄位
    if (data.stats) {
      positiveCount = data.stats.positive || 0;  // positive = 支持
      negativeCount = data.stats.negative || 0;  // negative = 反對
    } else if (data.positive !== undefined && data.negative !== undefined) {
      // 備用：使用根級別的 positive/negative 欄位
      positiveCount = data.positive || 0;  // positive = 支持
      negativeCount = data.negative || 0;  // negative = 反對
    }
    
    // 更新圓餅圖
    if (positiveCount > 0 || negativeCount > 0) {
      this.updateSentimentChart({
        '反對罷免人數': positiveCount,  // positive = 支持（反對罷免）
        '支持罷免人數': negativeCount,  // negative = 反對（支持罷免）
        '中性人數': 0
      });
      
      // 更新統計數據
      this.positiveCount = positiveCount;  // positive = 支持（反對罷免）
      this.negativeCount = negativeCount;  // negative = 反對（支持罷免）
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
      
      return;
    }
    this.updateChartFromStats(selectedStats);
    
    // 同時更新圓餅圖使用相同的資料來源，確保一致性
    this.updatePieChartFromTimeSeriesStats(timeSeriesStats);
  }
  
  // 新增方法：從統計數據更新圖表
  private updateChartFromStats(selectedStats: any): void {
    const points = selectedStats.stats_points;
    
    // 🔥 確保日期範圍已設置（根據投票日期和時間範圍計算）
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }
    
    // 🔥 根據用戶選擇的時間範圍篩選數據點
    const filteredPoints = this.filterPointsByTimeRange(points);
    
    if (filteredPoints.length === 0) {
      return;
    }
    
    // 計算資料範圍，用於改善圖表可視性
    // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
    let opposeRecallData = filteredPoints.map((p: any) => p.sentiment_counts?.POSITIVE || p.sentiment_counts?.positive || 0);  // positive = 支持（反對罷免）
    let supportRecallData = filteredPoints.map((p: any) => p.sentiment_counts?.NEGATIVE || p.sentiment_counts?.negative || 0);  // negative = 反對（支持罷免）
    
    // 🔥 確保最後一個點的數據等於圓餅圖的總計，但保持累計特性（不小於前一個點）
    // 獲取對應的 daily 數據來修正最後一個點
    if (this.data?.time_series_stats && opposeRecallData.length > 0 && supportRecallData.length > 0) {
      const dailyKeyMap: { [key: string]: string } = {
        'week': 'recent_7_days_daily',
        '2weeks': 'recent_14_days_daily',
        'month': 'recent_30_days_daily',
        '3months': 'recent_90_days_daily',
        '6months': 'recent_180_days_daily',
        '1year': 'recent_365_days_daily'
      };
      
      const dailyKey = dailyKeyMap[this.currentFilter] || 'recent_365_days_daily';
      const dailyStats = this.data.time_series_stats[dailyKey];
      
      let totalPositive = 0;
      let totalNegative = 0;
      
      if (dailyStats?.stats) {
        // 使用 daily 的總和作為目標值
        totalPositive = dailyStats.stats.positive || 0;
        totalNegative = dailyStats.stats.negative || 0;
      } else if (dailyStats?.stats_points && dailyStats.stats_points.length > 0) {
        // 如果沒有 stats 字段，使用 stats_points 的第一個點（daily 數據只有一個點）
        const point = dailyStats.stats_points[0];
        if (point.sentiment_counts) {
          totalPositive = point.sentiment_counts.POSITIVE || point.sentiment_counts.positive || 0;
          totalNegative = point.sentiment_counts.NEGATIVE || point.sentiment_counts.negative || 0;
        }
      }
      
      // 🔥 確保最後一個點的值不小於前一個點（保持累計特性）
      const lastIndex = opposeRecallData.length - 1;
      const prevPositive = lastIndex > 0 ? opposeRecallData[lastIndex - 1] : 0;
      const prevNegative = lastIndex > 0 ? supportRecallData[lastIndex - 1] : 0;
      
      // 使用較大值（總計或前一個點），確保累計趨勢不下降
      opposeRecallData[lastIndex] = Math.max(totalPositive, prevPositive);
      supportRecallData[lastIndex] = Math.max(totalNegative, prevNegative);
    }
    
    const allData = [...opposeRecallData, ...supportRecallData];
    const minValue = Math.min(...allData);
    const maxValue = Math.max(...allData);
    const dataRange = maxValue - minValue;
    
    // 如果資料範圍太小，設定最小範圍以確保變化可見
    const minRange = Math.max(dataRange, 10); // 最小範圍10
    const yAxisMin = Math.max(0, minValue - minRange * 0.1);
    const yAxisMax = maxValue + minRange * 0.1;
    
    // 🔥 前端生成 X 軸時間標籤（根據數據點數量和時間範圍），只替換 labels，數據保持不變
    const originalLabels = filteredPoints.map((p: any) => p.date);
    const newLabels = this.generateTimeAxisLabels(filteredPoints.length, this.currentFilter);
    
    this.demoLineChartData = {
      labels: newLabels, // 使用新生成的時間標籤
      datasets: [
        {
          label: '反對罷免',
          data: opposeRecallData,  // positive = 支持（反對罷免）
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79, 140, 255, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: '支持罷免',
          data: supportRecallData,  // negative = 反對（支持罷免）
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    };
    
    
    // 更新圖表選項以改善可視性
    this.updateLineChartOptionsForVisibility(yAxisMin, yAxisMax, dataRange);
    
    // 添加事件標記點
    this.addEventMarkersToChart();
    
    // 🔥 不要覆蓋手動設置的日期範圍
    // this.updateDateRangeFromChartData();
  }

  // 新增方法：根據數據點數量和時間範圍生成 X 軸時間標籤
  private generateTimeAxisLabels(pointCount: number, filter: string): string[] {
    // 🔥 使用已計算的開始和結束日期（與顯示期間一致）
    // 確保日期範圍已設置
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }
    
    // 如果還是沒有日期範圍，使用投票日期計算
    let startDate: Date;
    let endDate: Date;
    
    if (this.startDate && this.endDate) {
      startDate = new Date(this.startDate);
      endDate = new Date(this.endDate);
    } else {
      // 備用方案：取得投票日期
      let voteDate: Date | null = null;
      const legislatorName = this.data?.name;
      if (legislatorName && this.RECALL_VOTE_DATES[legislatorName]) {
        try {
          voteDate = new Date(this.RECALL_VOTE_DATES[legislatorName]);
          if (isNaN(voteDate.getTime())) {
            voteDate = null;
          }
        } catch (e) {
          voteDate = null;
        }
      }
      
      if (!voteDate && this.recallData) {
        const voteDateStr = this.recallData.recall_data?.罷免投票日 || this.recallData.recallVoteDate || '';
        if (voteDateStr) {
          try {
            voteDate = new Date(voteDateStr);
            if (isNaN(voteDate.getTime())) {
              voteDate = null;
            }
          } catch (e) {
            voteDate = null;
          }
        }
      }
      
      endDate = voteDate || new Date();
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
          startDate.setDate(endDate.getDate() - 364);
          break;
        default:
          startDate.setDate(endDate.getDate() - 29);
      }
    }
    
    const labels: string[] = [];
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 🔥 根據開始日期、結束日期和數據點數量生成標籤
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
    
    // 🔥 確保最後一個標籤是結束日期
    if (labels.length > 0) {
      labels[labels.length - 1] = endDate.toLocaleDateString('zh-TW', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
    
    return labels;
  }

  // 新增方法：根據時間範圍篩選數據點
  private filterPointsByTimeRange(points: any[]): any[] {
    if (!points || points.length === 0) {
      return [];
    }
    
    // 如果沒有設置日期範圍，先計算日期範圍
    if (!this.startDate || !this.endDate) {
      this.updateDateRangeForPeriod(this.currentFilter);
    }
    
    // 如果還是沒有日期範圍，返回所有數據點
    if (!this.startDate || !this.endDate) {
      return points;
    }
    
    // 根據日期範圍過濾數據點
    const filteredPoints = points.filter((point: any) => {
      if (!point.date) {
        return false;
      }
      
      const pointDate = point.date;
      return pointDate >= this.startDate && pointDate <= this.endDate;
    });
    
    // 🔥 如果過濾後沒有點，但原始數據有點，返回所有點（避免空圖表）
    if (filteredPoints.length === 0 && points.length > 0) {
      return points;
    }
    
    return filteredPoints;
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
    
    if (selectedStats?.stats) {
      // 使用簡化的stats字段（該時段內的實際資料總和）
      // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
      const totalPositive = selectedStats.stats.positive || 0;  // positive = 支持（反對罷免）
      const totalNegative = selectedStats.stats.negative || 0;  // negative = 反對（支持罷免）
      
      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [totalPositive, totalNegative],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
          backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
        }]
      };
      
      this.positiveCount = totalPositive;  // positive = 支持（反對罷免）
      this.negativeCount = totalNegative;  // negative = 反對（支持罷免）
      
    } else if (selectedStats?.stats_points && selectedStats.stats_points.length > 0) {
      // Daily 數據的 stats_points 已經是期間總和，不需要累加
      // 直接使用第一個（也是唯一一個）統計點的數據
      // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
      const point = selectedStats.stats_points[0];
      if (point.sentiment_counts) {
        const totalPositive = point.sentiment_counts.POSITIVE || point.sentiment_counts.positive || 0;  // positive = 支持（反對罷免）
        const totalNegative = point.sentiment_counts.NEGATIVE || point.sentiment_counts.negative || 0;  // negative = 反對（支持罷免）
        
        this.sentimentChartData = {
          labels: ['反對罷免', '支持罷免'],
          datasets: [{
            data: [totalPositive, totalNegative],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
            backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
          }]
        };
        
        this.positiveCount = totalPositive;  // positive = 支持（反對罷免）
        this.negativeCount = totalNegative;  // negative = 反對（支持罷免）
      }
      
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

    this.dataService.getLegislatorUnifiedData(this.politicianId).subscribe({
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
      // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
      const positive_count = data.sentiment_analysis.positive_count || data.sentiment_analysis.positive || 0;  // positive = 支持（反對罷免）
      const negative_count = data.sentiment_analysis.negative_count || data.sentiment_analysis.negative || 0;  // negative = 反對（支持罷免）
      const total_people = data.sentiment_analysis.total_people || data.sentiment_analysis.total || (positive_count + negative_count);
      const time_period = data.sentiment_analysis.time_period;
      
      // 更新圓餅圖數據（罷免場景：支持=反對罷免=positive，反對=支持罷免=negative）
      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [positive_count, negative_count],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
          backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
        }]
      };

      // 更新統計數據
      this.positiveCount = positive_count;  // positive = 支持（反對罷免）
      this.negativeCount = negative_count;  // negative = 反對（支持罷免）

    } else {
      // 如果沒有 sentiment_analysis，使用舊的邏輯
      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [this.positiveCount, this.negativeCount],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
          backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
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
      return;
    }


    // 檢查是否至少有一個情緒類別有數據
    if (!emotionCounts || Object.keys(emotionCounts).length === 0) {
      return;
    }

    // 根據標準情緒列表生成數據
    const emotionValues = this.STANDARD_EMOTIONS.map(emotion => emotionCounts[emotion] || 0);


    // 檢查是否有有效數據
    const allZeroes = emotionValues.every(val => val === 0);
    if (allZeroes) {
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
      return;
    }

    // 檢查是否為罷免相關的數據格式
    if (sentimentData['反對罷免人數'] !== undefined && sentimentData['支持罷免人數'] !== undefined) {
      // 罷免數據格式：直接使用
      this.positiveCount = sentimentData['反對罷免人數'] || 0;
      this.negativeCount = sentimentData['支持罷免人數'] || 0;
    } else if (sentimentData.positive && sentimentData.negative) {
      // 舊格式：{positive: {...}, negative: {...}}
      const positiveTotal = Object.values(sentimentData.positive).reduce((sum: number, val: any) => sum + (val || 0), 0);
      const negativeTotal = Object.values(sentimentData.negative).reduce((sum: number, val: any) => sum + (val || 0), 0);
      
      this.positiveCount = positiveTotal;
      this.negativeCount = negativeTotal;
    } else if (typeof sentimentData === 'object' && !sentimentData.positive && !sentimentData.negative) {
      // 新格式：{ joy: 10, anger: 5, ... }
      const totalEmotions = Object.values(sentimentData).reduce((sum: number, val: any) => sum + (val || 0), 0);
      
      // 簡單分配：一半為正面，一半為負面（或者根據實際業務邏輯調整）
      this.positiveCount = Math.floor(totalEmotions / 2);
      this.negativeCount = totalEmotions - this.positiveCount;
    } else {
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

  // 修正百分比計算 - positiveCount=反對罷免，negativeCount=支持罷免
  getSupportPercentage(): string {
    const total = this.positiveCount + this.negativeCount;
    if (total === 0) return '0.0';
    return ((this.negativeCount / total) * 100).toFixed(1);  // negativeCount = 支持罷免
  }

  getOpposePercentage(): string {
    const total = this.positiveCount + this.negativeCount;
    if (total === 0) return '0.0';
    return ((this.positiveCount / total) * 100).toFixed(1);  // positiveCount = 反對罷免
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
  
  // 新增方法：根據時間範圍更新日期範圍
  private updateDateRangeForPeriod(period: string): void {
    // 取得投票日期（優先使用對應表，其次使用 recallData 中的投票日期）
    let voteDate: Date | null = null;
    
    // 先從對應表中取得投票日期
    const legislatorName = this.data?.name;
    if (legislatorName && this.RECALL_VOTE_DATES[legislatorName]) {
      try {
        voteDate = new Date(this.RECALL_VOTE_DATES[legislatorName]);
        // 驗證日期是否有效
        if (isNaN(voteDate.getTime())) {
          voteDate = null;
        }
      } catch (e) {
        voteDate = null;
      }
    }
    
    // 如果對應表中沒有，則嘗試從 recallData 中取得
    if (!voteDate && this.recallData) {
      const voteDateStr = this.recallData.recall_data?.罷免投票日 || this.recallData.recallVoteDate || '';
      if (voteDateStr) {
        try {
          voteDate = new Date(voteDateStr);
          // 驗證日期是否有效
          if (isNaN(voteDate.getTime())) {
            voteDate = null;
          }
        } catch (e) {
          voteDate = null;
        }
      }
    }
    
    // 使用投票日期作為結束日期，如果沒有投票日期則使用今天
    const endDateObj = voteDate || new Date();
    const endDate = endDateObj.toISOString().split('T')[0];
    let startDate = new Date(endDateObj);
    
    switch (period) {
      case 'week':
        startDate.setDate(endDateObj.getDate() - 6); // 包含投票日，所以減6天
        break;
      case '2weeks':
        startDate.setDate(endDateObj.getDate() - 13); // 包含投票日，所以減13天
        break;
      case 'month':
        startDate.setDate(endDateObj.getDate() - 29); // 包含投票日，所以減29天
        break;
      case '3months':
        startDate.setDate(endDateObj.getDate() - 89); // 包含投票日，所以減89天
        break;
      case '6months':
        startDate.setDate(endDateObj.getDate() - 179); // 包含投票日，所以減179天
        break;
      case '1year':
        startDate.setDate(endDateObj.getDate() - 364); // 包含投票日，所以減364天
        break;
      case 'all':
        startDate.setDate(endDateObj.getDate() - 364);
        break;
      default:
        startDate.setDate(endDateObj.getDate() - 29);
    }
    
    this.startDate = startDate.toISOString().split('T')[0];
    this.endDate = endDate;
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

    // 🔥 立即更新日期範圍顯示
    this.updateDateRangeForPeriod(period);


    // 首先嘗試使用本地的 time_series_stats 數據
    if (this.data?.time_series_stats) {
      this.processTimeSeriesStats(this.data.time_series_stats);
      
      // 🔥 調用圓餅圖 API 更新數據
      this.updatePieChartFromAPI();
      
      // 🔥 不要覆蓋手動設置的日期範圍
      // this.updateDateRangeFromChartData();
      
      this.isLoadingTimeData = false;
      return;
    }

    // 如果沒有本地數據，則從API獲取
    this.dataService.getLegislatorUnifiedData(this.politicianId).subscribe({
      next: (data) => {
        if (data) {
          // 處理時間序列圖表數據
          if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
            this.demoLineChartData = data.time_series;
            
            // 🔥 不要覆蓋手動設置的日期範圍
            // this.updateDateRangeFromChartData();
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
            // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
            const positive_count = data.sentiment_analysis.positive_count || data.sentiment_analysis.positive || 0;  // positive = 支持（反對罷免）
            const negative_count = data.sentiment_analysis.negative_count || data.sentiment_analysis.negative || 0;  // negative = 反對（支持罷免）
            const total_people = data.sentiment_analysis.total_people || data.sentiment_analysis.total || (positive_count + negative_count);
            const time_period = data.sentiment_analysis.time_period;
            
            // 更新圓餅圖數據（罷免場景：支持=反對罷免=positive，反對=支持罷免=negative）
            this.sentimentChartData = {
              labels: ['反對罷免', '支持罷免'],
              datasets: [{
                data: [positive_count, negative_count],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
                backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
              }]
            };
            
            // 更新統計數據
            this.positiveCount = positive_count;  // positive = 支持（反對罷免）
            this.negativeCount = negative_count;  // negative = 反對（支持罷免）
            
          } else {
            // 如果沒有 sentiment_analysis，使用根級別數據作為備用
            // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
            this.positiveCount = this.data.positive || 0;  // positive = 支持（反對罷免）
            this.negativeCount = this.data.negative || 0;  // negative = 反對（支持罷免）
            
            this.updateSentimentChart({
              '反對罷免人數': this.data.positive || 0,  // positive = 支持（反對罷免）
              '支持罷免人數': this.data.negative || 0,  // negative = 反對（支持罷免）
              '中性人數': 0
            });
          }
          
          // 處理情緒分析數據
          if (data.emotion_analysis) {
            this.updateEmotionRadarChart(data.emotion_analysis);
          }
          
          this.isLoadingTimeData = false;
        } else {
          this.isLoadingTimeData = false;
        }
      },
      error: (error) => {
        this.isLoadingTimeData = false;
      }
    });
  }



  // 簡化方法：根據圖表數據更新日期範圍
  private updateDateRangeFromChartData(): void {
    // 🔥 如果已經有手動設置的日期範圍，不要覆蓋
    if (this.startDate && this.endDate) {
      return;
    }
    
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
        // 🔥 強制設置結束日期為今天
        this.endDate = new Date().toISOString().split('T')[0];
      }
    } catch (e) {
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
        }
      },
      error: (error) => {
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

  // 新增方法：動態計算顯示期間（基於 currentFilter，不依賴後端數據）
  getDisplayPeriod(): string {
    // 取得投票日期（優先使用對應表，其次使用 recallData 中的投票日期）
    let voteDate: Date | null = null;
    
    // 先從對應表中取得投票日期
    const legislatorName = this.data?.name;
    if (legislatorName && this.RECALL_VOTE_DATES[legislatorName]) {
      try {
        voteDate = new Date(this.RECALL_VOTE_DATES[legislatorName]);
        // 驗證日期是否有效
        if (isNaN(voteDate.getTime())) {
          voteDate = null;
        }
      } catch (e) {
        voteDate = null;
      }
    }
    
    // 如果對應表中沒有，則嘗試從 recallData 中取得
    if (!voteDate && this.recallData) {
      const voteDateStr = this.recallData.recall_data?.罷免投票日 || this.recallData.recallVoteDate || '';
      if (voteDateStr) {
        try {
          voteDate = new Date(voteDateStr);
          // 驗證日期是否有效
          if (isNaN(voteDate.getTime())) {
            voteDate = null;
          }
        } catch (e) {
          voteDate = null;
        }
      }
    }
    
    // 使用投票日期作為結束日期，如果沒有投票日期則使用今天
    const endDateObj = voteDate || new Date();
    const endDate = endDateObj.toISOString().split('T')[0];
    
    let startDate = new Date(endDateObj);
    let days = 0;
    
    // 根據當前篩選器計算日期範圍（以投票日期為基準）
    switch (this.currentFilter) {
      case 'week':
        days = 7;
        startDate.setDate(endDateObj.getDate() - 6); // 包含投票日，所以減6天
        break;
      case '2weeks':
        days = 14;
        startDate.setDate(endDateObj.getDate() - 13); // 包含投票日，所以減13天
        break;
      case 'month':
        days = 30;
        startDate.setDate(endDateObj.getDate() - 29); // 包含投票日，所以減29天
        break;
      case '3months':
        days = 90;
        startDate.setDate(endDateObj.getDate() - 89); // 包含投票日，所以減89天
        break;
      case '6months':
        days = 180;
        startDate.setDate(endDateObj.getDate() - 179); // 包含投票日，所以減179天
        break;
      case '1year':
        days = 365;
        startDate.setDate(endDateObj.getDate() - 364); // 包含投票日，所以減364天
        break;
      case 'all':
        days = 365;
        startDate.setDate(endDateObj.getDate() - 364);
        break;
      default:
        days = 30;
        startDate.setDate(endDateObj.getDate() - 29);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    return `${startDateStr} - ${endDate} (${days}天)`;
  }

  // 計算兩個日期之間的天數差異
  private calculateDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
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

    // 🔥 更新圖表標題
    this.updateChartTitle(this.selectedTimeRange);

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
    // 使用統一API獲取圓餅圖數據
    this.dataService.getLegislatorUnifiedData(this.politicianId).subscribe({
      next: (data: any) => {
        // 從統一API響應中提取圓餅圖數據
        if (data.sentiment_analysis) {
          // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
          const positive_count = data.sentiment_analysis.positive_count || data.sentiment_analysis.positive || 0;  // positive = 支持（反對罷免）
          const negative_count = data.sentiment_analysis.negative_count || data.sentiment_analysis.negative || 0;  // negative = 反對（支持罷免）
          
          // 更新圓餅圖數據（罷免場景：支持=反對罷免=positive，反對=支持罷免=negative）
          this.sentimentChartData = {
            labels: ['反對罷免', '支持罷免'],
            datasets: [{
              data: [positive_count, negative_count],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
              backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
            }]
          };
          
          // 更新統計數據
          this.positiveCount = positive_count;  // positive = 支持（反對罷免）
          this.negativeCount = negative_count;  // negative = 反對（支持罷免）
        }
      },
      error: (error: any) => {
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
    
    
    // 使用統一API獲取圓餅圖數據
    this.dataService.getLegislatorUnifiedData(this.politicianId).subscribe({
      next: (data: any) => {
        // 從統一API響應中提取圓餅圖數據
        if (data.sentiment_analysis) {
          // 🔥 統一標籤：positive = 支持（反對罷免），negative = 反對（支持罷免）
          const positive_count = data.sentiment_analysis.positive_count || data.sentiment_analysis.positive || 0;  // positive = 支持（反對罷免）
          const negative_count = data.sentiment_analysis.negative_count || data.sentiment_analysis.negative || 0;  // negative = 反對（支持罷免）
          
          // 更新圓餅圖數據（罷免場景：支持=反對罷免=positive，反對=支持罷免=negative）
          this.sentimentChartData = {
            labels: ['反對罷免', '支持罷免'],
            datasets: [{
              data: [positive_count, negative_count],  // [反對罷免=positive=支持, 支持罷免=negative=反對]
              backgroundColor: ['#4f8cff', '#f87171']  // 藍色=正面/支持（反對罷免），紅色=負面/反對（支持罷免）
            }]
          };
          
          // 更新統計數據
          this.positiveCount = positive_count;  // positive = 支持（反對罷免）
          this.negativeCount = negative_count;  // negative = 反對（支持罷免）
        }
      },
      error: (error: any) => {
      }
    });
  }




}
