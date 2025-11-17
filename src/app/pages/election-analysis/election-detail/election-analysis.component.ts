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
  
  // 圖表選項 - 動態調整標籤顯示
  lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      interaction: {
        mode: 'nearest' as const,
        intersect: false,
      },
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
          }
        }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '時間',
          font: {
            size: 10
          }
        },
        ticks: {
          font: {
            size: 8
          },
          maxTicksLimit: 20, // 增加最大標籤數量
          autoSkip: false, // 禁用自動跳過標籤
          maxRotation: 45, // 允許標籤旋轉45度
          minRotation: 0
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: '累計網友數',
          font: {
            size: 10
          }
        },
        ticks: {
          font: {
            size: 8
          },
          maxTicksLimit: 5
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#dee2e6',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: '候選人',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: '網友數',
          font: {
            size: 14,
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
      if (this.electionId) {
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

        this.totalCandidates = data.statistics.total_candidates;
        this.totalSentiment = data.statistics.total_sentiment;
        this.averageSentiment = data.statistics.average_sentiment;

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
        
        // 創建新的圖表數據，使用動態生成的標籤
        this.lineChartData = {
          labels: labels,
          datasets: originalData.datasets || []
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
          label: '總網友數',
          data: totalData,  // 累計總網友數，只會上漲或持平
          positiveData: positiveData,  // 累計正面網友數
          negativeData: negativeData,  // 累計負面網友數
          candidateName: '總網友數',
          borderColor: '#3b82f6',
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
    this.router.navigate(['/election-analysis']);
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

  // 根據數據點數量動態調整圖表選項
  private updateChartOptionsForDataPoints(dataPointCount: number): void {
    // 根據數據點數量調整 X 軸標籤顯示策略
    let maxTicksLimit: number;
    let autoSkip: boolean;
    let maxRotation: number;

    if (dataPointCount <= 7) {
      // 7天內：顯示所有標籤
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 0;
    } else if (dataPointCount <= 14) {
      // 14天內：顯示所有標籤，允許輕微旋轉
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 15;
    } else if (dataPointCount <= 30) {
      // 30天內：顯示所有標籤，允許旋轉
      maxTicksLimit = dataPointCount;
      autoSkip = false;
      maxRotation = 30;
    } else if (dataPointCount <= 90) {
      // 90天內：顯示大部分標籤，允許旋轉
      maxTicksLimit = Math.min(dataPointCount, 30);
      autoSkip = false;
      maxRotation = 45;
    } else {
      // 超過90天：智能跳過標籤
      maxTicksLimit = 20;
      autoSkip = true;
      maxRotation = 45;
    }

    // 更新圖表選項
    this.lineChartOptions.scales.x.ticks.maxTicksLimit = maxTicksLimit;
    this.lineChartOptions.scales.x.ticks.autoSkip = autoSkip;
    this.lineChartOptions.scales.x.ticks.maxRotation = maxRotation;

    console.log('🔍 圖表選項更新:', {
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
