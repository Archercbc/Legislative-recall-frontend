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
import { type ChartData } from 'chart.js'; // 確保導入 ChartData 類型

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
    }}
  };



  public lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        display: true,
        position: 'cursor' as const
      },
      tooltip: {
        enabled: true,
        intersect: false,
        mode: 'index' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          title: function(context: any) {
            return `時間: ${context[0].label}`;
          },
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString()} 筆`;
          }
        }
      }
    },
    hover: {
      mode: 'nearest' as const,
      intersect: false
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.3
      },
      point: {
        radius: 4,
        hoverRadius: 6
      }
    },
    // 支持橫向滾動
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  public radarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 14
        }
      }
    },
    tooltip: {
      enabled: true,
      position: 'nearest' as const, // 保持 'nearest'
      // 嘗試設定 yAlign 為 'bottom'，讓工具提示框顯示在數據點上方
      yAlign: 'bottom' as const, 
      // xAlign 可以根據需要設定，例如 'center'
      xAlign: 'center' as const, 
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#ddd',
      borderWidth: 1,
      callbacks: {
        label: function(context: any) {
          const label = context.dataset.label || '';
          const value = context.parsed.r;
          return `${label}: ${value.toLocaleString()}`;
        }
      }
    }
  },
  scales: {
    r: {
      beginAtZero: true,
      suggestedMax: 1000, // 考慮動態設定
      ticks: {
        display: false
      },
      pointLabels: {
        font: {
          size: 12
        }
      }
    }
  },
  elements: {
    point: {
      radius: 6,
      hoverRadius: 8
    },
    line: {
      borderWidth: 3
    }
  }
};      

  constructor(private route: ActivatedRoute, private dataService: DataService) {
    // 初始化時間範圍為最近一個月
    this.initializeDateRange();

    this.route.paramMap.subscribe(params => {
      this.politicianId = params.get('politicianId') || '';
      if (this.politicianId) {
        this.dataService.getLegislatorDetail(this.politicianId).subscribe(res => {
          this.data = res;
          // 解析學歷、經歷、電話、地址
          this.education = (res.education || res.education_list || []).length ? (res.education || res.education_list) : (res.constituency || []).filter((c: string) => c.startsWith('學歷：')).map((c: string) => c.replace('學歷：', ''));
          this.experience = (res.experience || res.experience_list || []).length ? (res.experience || res.experience_list) : (res.constituency || []).filter((c: string) => c.startsWith('經歷：')).map((c: string) => c.replace('經歷：', ''));
          this.phone = res.phone || (res.constituency || []).find((c: string) => c.startsWith('電話：'))?.replace('電話：', '') || '';
          this.address = res.address || (res.constituency || []).find((c: string) => c.startsWith('地址：'))?.replace('地址：', '') || '';

          // recall 罷免資料
          this.dataService.getRecallList().subscribe(recallList => {
            this.recallData = recallList.find(r => r["姓名"] === this.data.name);
          });
          // 處理情感分析、情緒分析、詞雲（從初始數據獲取）
          this.processChartData(res);

          // 同時載入時間序列數據（詞雲 + 完整時間變化）
          this.loadInitialTimeSeriesData();
        });
      }
    });
  }

  private loadInitialTimeSeriesData(): void {
    this.dataService.getLegislatorTimeSeriesData(this.politicianId).subscribe({
      next: (timeSeriesData) => {
        this.updateTimeSeriesCharts(timeSeriesData);
      },
      error: (error) => {
        console.error('載入時間序列數據失敗:', error);
      }
    });

    // 載入日期範圍限制
    this.dataService.getLegislatorDateRange(this.politicianId).subscribe({
      next: (dateRangeData) => {
        // 設定日期範圍限制
        if (dateRangeData && dateRangeData.start_date && dateRangeData.end_date) {
          this.minDate = dateRangeData.start_date;
          this.maxDate = dateRangeData.end_date;
        }
      },
      error: (error) => {
        console.error('載入日期範圍失敗:', error);
      }
    });
  }

    private updateTimeSeriesCharts(data: any): void {
      // 更新詞雲（從 crawler_data 獲取）
      if (data.word_cloud && data.word_cloud.length > 0) {
        this.demoWordCloudData = data.word_cloud;
      }

      // 更新折線圖（完整時間範圍，3個月間隔）
      if (data.time_series && data.time_series.labels && data.time_series.labels.length > 0) {
        this.demoLineChartData = { ...data.time_series };
      }

      // 更新雷達圖（從 crawler_data 的詳細情緒分析獲取）
      if (data.emotion_analysis_detailed &&
          (Object.keys(data.emotion_analysis_detailed.positive || {}).length > 0 ||
           Object.keys(data.emotion_analysis_detailed.negative || {}).length > 0)) {

        const positiveEmotions = data.emotion_analysis_detailed.positive || {};
        const negativeEmotions = data.emotion_analysis_detailed.negative || {};

        // 定義標準的8大情緒 + neutral
        const standardEmotions = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation', 'neutral'];
        // 根據情感標籤分類的情緒數據，只使用標準情緒
        const positiveData = standardEmotions.map(emotion => positiveEmotions[emotion] || 0);
        const negativeData = standardEmotions.map(emotion => negativeEmotions[emotion] || 0);

        // 計算最大值，動態設定雷達圖範圍
        const allValues = [...positiveData, ...negativeData];
        const maxValue = Math.max(...allValues);
        const suggestedMax = Math.ceil(maxValue * 1.2); // 增加20%的空間

        // 更新雷達圖配置的最大值
        this.radarChartOptions.scales.r.suggestedMax = suggestedMax;

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

  // 處理圖表資料（根據您提供的資料結構）
  private processChartData(data: any) {
    // 處理情感分析（圓餅圖）- 修正標籤對應
    if (data.情感分析) {
      const sentiment = data.情感分析;
      // POSITIVE = 反對罷免，NEGATIVE = 支持罷免
      this.negativeCount = sentiment.支持罷免人數 || 0;  // NEGATIVE = 支持罷免
      this.positiveCount = sentiment.反對罷免人數 || 0;  // POSITIVE = 反對罷免

      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [this.positiveCount, this.negativeCount],
          backgroundColor: ['#4f8cff', '#f87171']  // 藍色=反對，紅色=支持
        }]
      };
    } else {
      // 如果沒有情感分析數據，清空圓餅圖數據
      this.sentimentChartData = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
      this.positiveCount = 0;
      this.negativeCount = 0;
    }

    // 處理情緒分析（雷達圖）- 使用標準情緒
    if (data.情緒分析) {
      const emotions = data.情緒分析;

      // 定義標準的8大情緒 + neutral
      const standardEmotions = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation', 'neutral'];
      // 正確定義正面和負面情緒
      const positiveEmotions = ['joy', 'surprise', 'trust', 'anticipation']; // 正面情緒 = 反對罷免
      const negativeEmotions = ['anger', 'sadness', 'fear', 'disgust']; // 負面情緒 = 支持罷免

      // 分離正面和負面情緒數據，只使用標準情緒
      const positiveData = standardEmotions.map(emotion =>
        positiveEmotions.includes(emotion) ? (emotions[emotion] || 0) : 0
      );
      const negativeData = standardEmotions.map(emotion =>
        negativeEmotions.includes(emotion) ? (emotions[emotion] || 0) : 0
      );

      this.radarChartData = {
        labels: standardEmotions,
        datasets: [
          {
            label: '反對罷免情緒',
            data: positiveData,
            backgroundColor: 'rgba(79, 140, 255, 0.2)', // 藍色 - 與圓餅圖一致
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
            backgroundColor: 'rgba(248, 113, 113, 0.2)', // 紅色 - 與圓餅圖一致
            borderColor: '#f87171',
            pointBackgroundColor: '#f87171',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#f87171',
            borderWidth: 2
          }
        ]
      };
    } else {
      // 如果沒有情緒分析數據，清空雷達圖數據
      this.radarChartData = { labels: [], datasets: [] };
    }

    // 處理詞雲資料（如果有 top_words）
    if (data.top_words && Array.isArray(data.top_words)) {
      this.demoWordCloudData = data.top_words.map((w: any) => ({
        text: w.word || w.text,
        weight: w.count || w.weight || 1
      }));
    } else {
      // 如果沒有詞雲資料，可以從情緒分析生成簡單的詞雲
      if (data.情緒分析) {
        this.demoWordCloudData = Object.entries(data.情緒分析).map(([emotion, count]) => ({
          text: emotion,
          weight: count as number
        }));
      } else {
        this.demoWordCloudData = []; // 如果都沒有，清空詞雲
      }
    }
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

  // 獲取前幾名情緒及其比例
  getTopEmotions(): Array<{ name: string, percentage: string }> {
    if (!this.data || !this.data['情緒分析']) return [];

    const emotions = this.data['情緒分析'];
    const totalEmotions = Object.values(emotions).reduce((sum: number, val: any) => sum + (val as number), 0);

    // 轉換為陣列並排序
    const emotionArray = Object.entries(emotions)
      .map(([name, count]) => ({
        name,
        count: count as number,
        percentage: totalEmotions > 0 ? (((count as number) / totalEmotions) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // 只顯示前3名

    return emotionArray;
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

  // 時間範圍相關方法
  initializeDateRange(): void {
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.endDate = today.toISOString().split('T')[0];
    this.startDate = oneMonthAgo.toISOString().split('T')[0];
  }

  setQuickFilter(period: string): void {
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        this.onDateRangeChange();
        break;
      case 'month':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        this.onDateRangeChange();
        break;
      case '3months':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        this.onDateRangeChange();
        break;
      case 'all':
        // 全部時間：重新載入初始時間序列數據
        this.loadInitialTimeSeriesData();
        break;
      default:
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        this.onDateRangeChange();
    }
  }

  onDateRangeChange(): void {
    if (this.startDate && this.endDate && this.politicianId) {
      this.loadTimeRangeData();
    }
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

    // 調用後端 API 獲取時間範圍內的數據
    this.dataService.getLegislatorTimeRangeData(
      this.politicianId,
      this.startDate,
      this.endDate
    ).subscribe({
      next: (data) => {
        this.updateChartsWithTimeData(data);
        this.isLoadingTimeData = false;
      },
      error: (error) => {
        console.error('載入時間範圍數據失敗:', error);
        this.isLoadingTimeData = false;
        // 如果載入失敗，清空圖表數據，避免渲染錯誤
        this.demoLineChartData = { labels: [], datasets: [] };
      }
    });
  }

  private updateChartsWithTimeData(data: any): void {
    // 更新圓餅圖 (情感分析) - 只有在有數據時才更新
    if (data.sentiment_analysis && (data.sentiment_analysis.oppose_count > 0 || data.sentiment_analysis.support_count > 0)) {
      this.positiveCount = data.sentiment_analysis.oppose_count || 0;
      this.negativeCount = data.sentiment_analysis.support_count || 0;

      // 創建一個新的物件給 sentimentChartData，以觸發 Change Detection
      this.sentimentChartData = {
        labels: ['反對罷免', '支持罷免'],
        datasets: [{
          data: [this.positiveCount, this.negativeCount],
          backgroundColor: ['#4f8cff', '#f87171']
        }]
      };
    } else {
      console.log('⚠️ 沒有情感分析數據，保持原有數據');
      // 不清空數據，保持原有的 legislators 集合數據
    }

    // 更新雷達圖 (情緒分析) - 使用詳細的情緒分析數據
    if (data.emotion_analysis_detailed &&
        (Object.keys(data.emotion_analysis_detailed.positive || {}).length > 0 ||
         Object.keys(data.emotion_analysis_detailed.negative || {}).length > 0)) {

      const positiveEmotions = data.emotion_analysis_detailed.positive || {};
      const negativeEmotions = data.emotion_analysis_detailed.negative || {};

      // 定義標準的8大情緒 + neutral
      const standardEmotions = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'trust', 'anticipation', 'neutral'];
      // 根據情感標籤分類的情緒數據，只使用標準情緒
      const positiveData = standardEmotions.map(emotion => positiveEmotions[emotion] || 0);
      const negativeData = standardEmotions.map(emotion => negativeEmotions[emotion] || 0);

      // 創建一個新的物件給 radarChartData
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
    } else {
      console.log('⚠️ 沒有情緒分析數據，保持原有數據');
      // 不清空數據，保持原有的 legislators 集合數據
    }

  // 更新詞雲 (如果您使用 ng2-charts 或自訂元件來顯示詞雲)
  if (data.word_cloud && Array.isArray(data.word_cloud)) {
    this.demoWordCloudData = data.word_cloud.map((w: any) => ({
      text: w.word || w.text,
      weight: w.count || w.weight || 1
    }));
  } else {
    this.demoWordCloudData = [];
  }


  // 更新折線圖 (時間序列)
  if (data.time_series && data.time_series.labels && data.time_series.datasets) {
    const newDatasets = data.time_series.datasets.map((ds: any) => {
      return {
        label: ds.label,
        data: ds.data,
        borderColor: ds.borderColor,
        backgroundColor: ds.backgroundColor,
        tension: ds.tension,
        fill: ds.fill === undefined || ds.fill === null ? false : ds.fill,
      };
    });

    // 創建一個新的物件給 demoLineChartData
    this.demoLineChartData = {
      labels: data.time_series.labels,
      datasets: newDatasets
    };
  } else {
    this.demoLineChartData = { labels: [], datasets: [] };
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
}