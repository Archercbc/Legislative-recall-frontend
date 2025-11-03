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
  selectedCandidateForTimeChart: string | null = null; // null = 顯示所有候選人總聲量
  
  // 時間篩選相關屬性 - 參考立委頁面
  currentFilter: string = '1year';
  isLoadingTimeData: boolean = false;
  
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
          text: '累計聲量',
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
          text: '聲量',
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
      // 顯示特定候選人的正負面聲量時間圖 - 使用真實數據
      const candidate = visibleCandidates.find(c => c.id === this.selectedCandidateForTimeChart);
      if (candidate && candidate.time_series_stats) {
        this.lineChartData = candidate.time_series_stats;
        
        // 為個人分析也動態調整圖表選項
        if (candidate.time_series_stats.labels) {
          this.updateChartOptionsForDataPoints(candidate.time_series_stats.labels.length);
        }
      } else {
        this.lineChartData = { labels: [], datasets: [] };
      }
    } else {
      // 顯示所有候選人的總聲量時間圖 - 使用真實數據
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
          label: '正面聲量',
          data: positiveData,
          backgroundColor: '#28a745',
          borderColor: '#28a745'
        },
        {
          label: '負面聲量',
          data: negativeData,
          backgroundColor: '#dc3545',
          borderColor: '#dc3545'
        }
      ]
    };
  }



  // 處理後端回傳的 time_series 數據 - 合併兩條線為總聲量（累計趨勢）
  private processTimeSeriesData(timeSeriesData: any): void {
    if (!timeSeriesData.labels || !timeSeriesData.datasets || timeSeriesData.datasets.length < 2) {
      console.warn('時間序列數據格式不正確');
      return;
    }

    const labels = timeSeriesData.labels;
    const negativeData = timeSeriesData.datasets[0].data; // 負面聲量（累計）
    const positiveData = timeSeriesData.datasets[1].data; // 正面聲量（累計）

    // 計算總聲量（正負面聲量相加）- 都是累計數據，只會上漲或持平
    const totalData = [];
    for (let i = 0; i < labels.length; i++) {
      totalData.push((negativeData[i] || 0) + (positiveData[i] || 0));
    }

    // 創建合併後的數據集（累計趨勢）
    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          label: '總聲量',
          data: totalData,  // 累計總聲量，只會上漲或持平
          positiveData: positiveData,  // 累計正面聲量
          negativeData: negativeData,  // 累計負面聲量
          candidateName: '總聲量',
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

    // 提取日期標籤
    const labels = firstCandidateStats.stats_points.map((point: any) => {
      if (point.date) {
        try {
          const date = new Date(point.date);
          return date.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        } catch (e) {
          return point.date;
        }
      }
      return '';
    });

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
    
    // 模擬載入時間
    setTimeout(() => {
      this.isLoadingTimeData = false;
    }, 500);
  }

  // 新增方法：動態計算顯示期間（基於 currentFilter，不依賴後端數據）
  getDisplayPeriod(): string {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = new Date();
    let days = 0;
    
    // 根據當前篩選器計算日期範圍（與 setQuickFilter 保持一致）
    switch (this.currentFilter) {
      case 'week':
        days = 7;
        startDate.setDate(today.getDate() - 6); // 包含今天，所以減6天
        break;
      case '2weeks':
        days = 14;
        startDate.setDate(today.getDate() - 13); // 包含今天，所以減13天
        break;
      case 'month':
        days = 30;
        startDate.setDate(today.getDate() - 29); // 包含今天，所以減29天
        break;
      case '3months':
        days = 90;
        startDate.setDate(today.getDate() - 89); // 包含今天，所以減89天
        break;
      case '6months':
        days = 180;
        startDate.setDate(today.getDate() - 179); // 包含今天，所以減179天
        break;
      case '1year':
        days = 365;
        startDate.setDate(today.getDate() - 364); // 包含今天，所以減364天
        break;
      case 'all':
        days = 365;
        startDate.setDate(today.getDate() - 364);
        break;
      default:
        days = 365;
        startDate.setDate(today.getDate() - 364);
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
}
