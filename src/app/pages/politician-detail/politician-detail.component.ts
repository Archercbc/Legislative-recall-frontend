import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
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

  constructor(private route: ActivatedRoute, private dataService: DataService, private http: HttpClient) {
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

          // 情緒分析資料
          this.dataService.getSentimentData(this.data.name).subscribe({
            
            next: (sentiment: any) => {
              console.log(sentiment);
              this.positiveCount = sentiment.positive_count || 0;
              this.negativeCount = sentiment.negative_count || 0;
              this.sentimentChartData = {
                labels: ['正面', '負面'],
                datasets: [{ data: [this.positiveCount, this.negativeCount], backgroundColor: ['#4f8cff', '#f87171'] }]
              };
              this.radarChartData = {
                labels: (sentiment.emotion || []).map((e: any) => e.emotion),
                datasets: [{
                  data: (sentiment.emotion || []).map((e: any) => e.count),
                  label: '情緒分布',
                  backgroundColor: 'rgba(79,140,255,0.2)',
                  borderColor: '#4f8cff'
                }]
              };
              this.wordCloudData = (sentiment.top_words || []).map((w: any) => ({ text: w.word, weight: w.count }));
            },
            error: err => {
              this.positiveCount = 0;
              this.negativeCount = 0;
              this.sentimentChartData = { labels: ['正面', '負面'], datasets: [{ data: [0, 0], backgroundColor: ['#4f8cff', '#f87171'] }] };
              this.radarChartData = { labels: [], datasets: [{ data: [], label: '情緒分布', backgroundColor: 'rgba(79,140,255,0.2)', borderColor: '#4f8cff' }] };
              this.wordCloudData = [];
            }
          });
        });
      }
    });
  }
  public lineChartData = {
    labels: ['一月', '二月', '三月', '四月'],
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
}
