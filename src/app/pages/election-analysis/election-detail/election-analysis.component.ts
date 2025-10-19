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
  
  // 圖表選項 - 縮小內部元素
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
          maxTicksLimit: 6
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

    // 根據選擇的時間範圍生成標籤
    const labels = this.generateTimeLabels();
    const days = this.getDaysFromTimeRange();

    let datasets: any[] = [];

    if (this.selectedCandidateForTimeChart) {
      // 顯示特定候選人的正負面聲量時間圖
      const candidate = visibleCandidates.find(c => c.id === this.selectedCandidateForTimeChart);
      if (candidate) {
        const positiveData = this.generateTimeSeriesDataForCandidate(candidate, days, 'positive');
        const negativeData = this.generateTimeSeriesDataForCandidate(candidate, days, 'negative');
        
        datasets = [
          {
            label: `${candidate.name} - 正面聲量`,
            data: positiveData,
            borderColor: '#28a745',
            backgroundColor: '#28a74520',
            tension: 0.4,
            fill: false,
            pointBackgroundColor: '#28a745',
            pointBorderColor: '#28a745',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: `${candidate.name} - 負面聲量`,
            data: negativeData,
            borderColor: '#dc3545',
            backgroundColor: '#dc354520',
            tension: 0.4,
            fill: false,
            pointBackgroundColor: '#dc3545',
            pointBorderColor: '#dc3545',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ];
      }
    } else {
      // 顯示所有候選人的累計總聲量時間圖 - 參考立委頁面實現
      datasets = visibleCandidates.map(candidate => {
        const positiveData = this.generateTimeSeriesDataForCandidate(candidate, days, 'positive');
        const negativeData = this.generateTimeSeriesDataForCandidate(candidate, days, 'negative');
        const cumulativeData = this.generateCumulativeData(positiveData, negativeData);
        
        return {
          label: candidate.name,
          data: cumulativeData,
          candidateName: candidate.name,
          candidateId: candidate.id,
          positiveData: positiveData,
          negativeData: negativeData,
          borderColor: candidate.color,
          backgroundColor: candidate.color + '20',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: candidate.color,
          pointBorderColor: candidate.color,
          pointRadius: 4,
          pointHoverRadius: 6
        } as any;
      });
    }

    this.lineChartData = {
      labels,
      datasets
    };
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
    this.updateLineChart();
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

  // 生成時間標籤
  private generateTimeLabels(): string[] {
    const days = this.getDaysFromTimeRange();
    const labels = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
  }

  // 根據時間範圍獲取天數
  private getDaysFromTimeRange(): number {
    switch (this.selectedTimeRange) {
      case '7_days': return 7;
      case '30_days': return 30;
      case '90_days': return 90;
      case '365_days': return 365;
      default: return 30;
    }
  }

  // 為特定候選人生成時間序列數據
  private generateTimeSeriesDataForCandidate(candidate: any, days: number, type?: 'positive' | 'negative'): number[] {
    const data = [];
    
    // 如果候選人有實際的時間序列數據，使用它
    if (candidate.time_series_stats && Array.isArray(candidate.time_series_stats)) {
      // 取最近 N 天的數據
      const recentData = candidate.time_series_stats.slice(-days);
      if (type) {
        // 如果有指定類型，嘗試從數據中提取對應的值
        return recentData.map((item: any) => {
          if (type === 'positive') return item.positive || item.value * 0.6 || 0;
          if (type === 'negative') return item.negative || item.value * 0.4 || 0;
          return item.value || item.total || 0;
        });
      }
      return recentData.map((item: any) => item.value || item.total || 0);
    }
    
    // 否則生成基於候選人基礎聲量的模擬數據
    let baseValue: number;
    if (type === 'positive') {
      baseValue = candidate.positive ?? 0;
    } else if (type === 'negative') {
      baseValue = candidate.negative ?? 0;
    } else {
      baseValue = (candidate.positive ?? 0) + (candidate.negative ?? 0);
    }
    
    // 確保有合理的基礎值
    const dailyBase = Math.max(20, Math.floor(baseValue / days));
    
    for (let i = 0; i < days; i++) {
      // 生成更真實的變化模式
      const trend = Math.sin(i / days * Math.PI) * 0.3; // 正弦波趨勢
      const randomVariation = (Math.random() - 0.5) * 0.4; // 隨機變化
      const value = Math.max(5, Math.floor(dailyBase * (0.7 + trend + randomVariation)));
      data.push(value);
    }
    
    return data;
  }

  // 生成累計數據
  private generateCumulativeData(positiveData: number[], negativeData: number[]): number[] {
    const cumulativeData = [];
    let cumulative = 0;
    
    for (let i = 0; i < positiveData.length; i++) {
      cumulative += positiveData[i] + negativeData[i];
      cumulativeData.push(cumulative);
    }
    
    return cumulativeData;
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

  // 直接處理候選人的時間序列數據
  private processCandidatesTimeSeriesData(): void {
    if (!this.candidates || this.candidates.length === 0) {
      return;
    }

    console.log('🔍 處理候選人時間序列數據:', this.candidates.length);

    // 為每個候選人創建數據集
    const datasets = this.candidates.map(candidate => {
      console.log(`🔍 處理候選人 ${candidate.name}:`, candidate.time_series_stats ? '有數據' : '無數據');
      
      if (!candidate.time_series_stats) {
        return {
          label: candidate.name,
          data: [],
          borderColor: candidate.color,
          backgroundColor: candidate.color + '20',
          tension: 0.3,
          fill: false
        };
      }

      // 根據當前篩選器選擇對應的數據
      const keyMap: { [key: string]: string } = {
        'week': 'recent_7_days_cumulative',
        '2weeks': 'recent_14_days_cumulative',
        'month': 'recent_30_days_cumulative',
        '3months': 'recent_90_days_cumulative',
        '6months': 'recent_180_days_cumulative',
        '1year': 'recent_365_days_cumulative'
      };

      const targetKey = keyMap[this.currentFilter] || 'recent_365_days_cumulative';
      const candidateStats = candidate.time_series_stats[targetKey];

      console.log(`🔍 ${candidate.name} 使用 ${targetKey}:`, candidateStats ? '有數據' : '無數據');

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

      // 提取數據點
      const candidateData = candidateStats.stats_points.map((point: any) => {
        const sentiment = point.sentiment_counts || {};
        const total = (sentiment.positive || 0) + (sentiment.negative || 0);
        console.log(`🔍 ${candidate.name} 數據點:`, point.date, 'total:', total);
        return total;
      });

      console.log(`🔍 ${candidate.name} 最終數據:`, candidateData.slice(0, 5), '...');

      return {
        label: candidate.name,
        data: candidateData,
        borderColor: candidate.color,
        backgroundColor: candidate.color + '20',
        tension: 0.3,
        fill: false
      };
    });

    // 使用第一個候選人的日期作為標籤
    const firstCandidate = this.candidates[0];
    if (firstCandidate && firstCandidate.time_series_stats) {
      const keyMap: { [key: string]: string } = {
        'week': 'recent_7_days_cumulative',
        '2weeks': 'recent_14_days_cumulative',
        'month': 'recent_30_days_cumulative',
        '3months': 'recent_90_days_cumulative',
        '6months': 'recent_180_days_cumulative',
        '1year': 'recent_365_days_cumulative'
      };

      const targetKey = keyMap[this.currentFilter] || 'recent_365_days_cumulative';
      const firstCandidateStats = firstCandidate.time_series_stats[targetKey];

      if (firstCandidateStats && firstCandidateStats.stats_points) {
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

        console.log('🔍 圖表標籤:', labels.slice(0, 5), '...');
        console.log('🔍 數據集數量:', datasets.length);

        // 更新圖表數據
        this.lineChartData = {
          labels: labels,
          datasets: datasets
        };
      }
    }
  }

  // 處理時間序列統計數據 - 完全參考立委頁面實現
  private processTimeSeriesStats(): void {
    if (!this.timeSeriesStats) {
      console.warn('沒有時間序列統計數據，使用模擬數據');
      return;
    }
    
    console.log('🔍 處理時間序列統計數據:', {
      currentFilter: this.currentFilter,
      timeSeriesStatsKeys: Object.keys(this.timeSeriesStats)
    });
    
    // 根據篩選器選擇對應的數據 - 與立委頁面完全一致
    const keyMap: { [key: string]: string } = {
      'week': 'recent_7_days_cumulative',
      '2weeks': 'recent_14_days_cumulative',
      'month': 'recent_30_days_cumulative',
      '3months': 'recent_90_days_cumulative',
      '6months': 'recent_180_days_cumulative',
      '1year': 'recent_365_days_cumulative'
    };
    
    const targetKey = keyMap[this.currentFilter] || 'recent_14_days_cumulative';
    const selectedStats = this.timeSeriesStats[targetKey];
    
    console.log('🔍 選擇的統計數據:', {
      targetKey,
      hasSelectedStats: !!selectedStats,
      hasStatsPoints: selectedStats?.stats_points ? selectedStats.stats_points.length : 0
    });
    
    if (!selectedStats?.stats_points) {
      // 嘗試找到最接近的替代數據
      const fallbackKeys = Object.keys(this.timeSeriesStats).filter(key => 
        key.includes('cumulative') && key.includes('days')
      );
      
      if (fallbackKeys.length > 0) {
        const fallbackKey = fallbackKeys[0];
        const fallbackStats = this.timeSeriesStats[fallbackKey];
        if (fallbackStats?.stats_points) {
          this.updateChartFromStats(fallbackStats);
          return;
        }
      }
      
      console.error('❌ 沒有找到任何可用的時間序列數據');
      return;
    }
    this.updateChartFromStats(selectedStats);
  }

  // 初始化時間序列圖表 - 與立委頁面完全一致
  private initializeTimeSeriesCharts(): void {
    if (!this.timeSeriesStats) {
      console.warn('⚠️ 沒有時間序列統計數據');
      return;
    }
    
    
    // 設置默認時間範圍為一年（因為初始應該載入365天）
    this.selectedTimeRange = '365_days';
    this.currentFilter = '1year'; // 設置對應的篩選器
    // 直接初始化圖表數據，不調用 onTimeRangeChange
    this.processTimeSeriesStats();
  }

  // 從統計數據更新圖表 - 完全參考立委頁面實現
  private updateChartFromStats(selectedStats: any): void {
    const points = selectedStats.stats_points;
    
    if (!points || points.length === 0) {
      console.warn('沒有時間序列數據點');
      return;
    }
    
    // 為每個候選人創建數據集
    const datasets = this.candidates.map(candidate => {
      const candidateData = points.map((p: any) => {
        const candidatePoint = p.candidates?.find((c: any) => c.candidate_id === candidate.id);
        if (candidatePoint) {
          return {
            positive: candidatePoint.sentiment_counts?.positive || 0,
            negative: candidatePoint.sentiment_counts?.negative || 0,
            total: (candidatePoint.sentiment_counts?.positive || 0) + (candidatePoint.sentiment_counts?.negative || 0)
          };
        }
        return { positive: 0, negative: 0, total: 0 };
      });
      
      // 計算累計數據 - 與立委頁面完全一致
      const cumulativeData = [];
      let cumulative = 0;
      for (const point of candidateData) {
        cumulative += point.total;
        cumulativeData.push(cumulative);
      }
      
      return {
        label: candidate.name,
        data: cumulativeData,
        candidateName: candidate.name,
        candidateId: candidate.id,
        positiveData: candidateData.map((p: any) => p.positive),
        negativeData: candidateData.map((p: any) => p.negative),
        borderColor: candidate.color,
        backgroundColor: candidate.color + '20',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: candidate.color,
        pointBorderColor: candidate.color,
        pointRadius: 4,
        pointHoverRadius: 6
      } as any;
    });
    
    // 格式化日期標籤 - 與立委頁面一致
    const labels = points.map((p: any) => {
      try {
        const date = new Date(p.date);
        return date.toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).replace(/\//g, '/');
      } catch (e) {
        return p.date;
      }
    });
    
    this.lineChartData = {
      labels,
      datasets
    };
  }

  // 時間篩選方法 - 參考立委頁面實現
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
    
    // 重新載入數據
    this.loadElectionAnalysisData(timeRange);
    
    // 模擬載入時間
    setTimeout(() => {
      this.isLoadingTimeData = false;
    }, 500);
  }
}
