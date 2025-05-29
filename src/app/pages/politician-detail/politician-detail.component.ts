import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import {   ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardImgDirective,
  CardTextDirective,
  CardTitleDirective,BadgeComponent  } from '@coreui/angular';
  import { AvatarComponent } from '@coreui/angular';
  import { ListGroupDirective, ListGroupItemDirective } from '@coreui/angular';

import { type ChartData } from 'chart.js';
import { ChartjsComponent } from '@coreui/angular-chartjs';
@Component({
    selector: 'app-politician-detail',
    imports: [CommonModule, HttpClientModule, NgChartsModule,
       ChartjsComponent
    ],
    templateUrl: './politician-detail.component.html',
    styleUrl: './politician-detail.component.scss'
})
export class PoliticianDetailComponent {
  politicianId = '';
  data: any = null;
  recallData: any = null;
  sentimentData: any[] = [];
  positiveCount = 0;
  negativeCount = 0;
  radarChartData: any = { labels: [], datasets: [{ data: [], label: '情緒分布', backgroundColor: 'rgba(79,140,255,0.2)', borderColor: '#4f8cff' }] };
  education: string[] = [];
  experience: string[] = [];
  phone: string = '';
  address: string = '';

  // 圖表資料

  sentimentChartData: any = { labels: ['正面', '負面'], datasets: [{ data: [0, 0], backgroundColor: ['#4f8cff', '#f87171'] }] };
  wordCloudData: { text: string, weight: number }[] = [];

  // 圓餅圖配置 - 美化 tooltip
  doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // 隱藏預設圖例，使用自定義顯示
      },
      tooltip: {
        enabled: true,
        position: 'nearest' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        callbacks: {
          title: () => '',
          label: (context: any) => {
            const label = context.label;
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // 雷達圖配置 - 美化 tooltip
  radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        position: 'nearest' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        callbacks: {
          title: () => '',
          label: (context: any) => {
            return `${context.label}: ${context.parsed.r}`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  constructor(private route: ActivatedRoute, private dataService: DataService) {
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

          // 處理情感分析資料（直接從 res 中獲取）
          this.processChartData(res);
        });
      }
    });
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
    }

    // 處理情緒分析（雷達圖）
    if (data.情緒分析) {
      const emotions = data.情緒分析;
      const emotionLabels = Object.keys(emotions);
      const emotionValues = Object.values(emotions) as number[];

      this.radarChartData = {
        labels: emotionLabels,
        datasets: [{
          data: emotionValues,
          label: '情緒分布',
          backgroundColor: 'rgba(79,140,255,0.2)',
          borderColor: '#4f8cff'
        }]
      };
    }

    // 處理詞雲資料（如果有 top_words）
    if (data.top_words && Array.isArray(data.top_words)) {
      this.wordCloudData = data.top_words.map((w: any) => ({
        text: w.word || w.text,
        weight: w.count || w.weight || 1
      }));
    } else {
      // 如果沒有詞雲資料，可以從情緒分析生成簡單的詞雲
      if (data.情緒分析) {
        this.wordCloudData = Object.entries(data.情緒分析).map(([emotion, count]) => ({
          text: emotion,
          weight: count as number
        }));
      }
    }
  }

  // Demo 折線圖資料
  demoLineChartData = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [{
      label: '支持罷免',
      data: [35, 42, 38, 45, 41, 47],
      borderColor: '#f87171',
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      tension: 0.3,
      fill: true
    }, {
      label: '反對罷免',
      data: [65, 58, 62, 55, 59, 53],
      borderColor: '#4f8cff',
      backgroundColor: 'rgba(79, 140, 255, 0.1)',
      tension: 0.3,
      fill: true
    }]
  };

  // Demo 詞雲資料
  demoWordCloudData = [
    { text: '政策', weight: 100 },
    { text: '民意', weight: 85 },
    { text: '改革', weight: 70 },
    { text: '透明', weight: 65 },
    { text: '責任', weight: 60 },
    { text: '效率', weight: 55 },
    { text: '公正', weight: 50 },
    { text: '服務', weight: 45 },
    { text: '溝通', weight: 40 },
    { text: '監督', weight: 35 }
  ];

  public lineChartData = {
    labels: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    datasets: [
      {
        data: [50, 60, 70, 90],
        label: '罷免支持度',
        borderColor: '#3e95cd',
        fill: false,
        tension: 0.3,
      }
    ]
  };

  public lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        intersect: false,
        mode: 'index' as const
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
        radius: 3
      }
    }
  };

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
  getTopEmotions(): Array<{name: string, percentage: string}> {
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
}
