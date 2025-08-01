import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Politician {
  id: string;
  name: string;
  title: string;
  region: string;
  category: string;
  image: string;
  supportRate: number;
  commentCount: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-politicians',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './politicians.component.html',
  styleUrl: './politicians.component.scss'
})
export class PoliticiansComponent implements OnInit {
  selectedCategory = 'president';
  filteredPoliticians: Politician[] = [];

  categories: Category[] = [
    { id: 'president', name: '總統', icon: 'fas fa-crown' },
    { id: 'legislators', name: '立委', icon: 'fas fa-landmark' },
    { id: 'mayors', name: '市長', icon: 'fas fa-city' },
    { id: 'county-mayors', name: '縣市長', icon: 'fas fa-building' }
  ];

  politicians: Politician[] = [
    // 總統
    {
      id: 'president-1',
      name: '賴清德',
      title: '中華民國總統',
      region: '全國',
      category: 'president',
      image: 'assets/images/politicians/lai-ching-te.jpg',
      supportRate: 45,
      commentCount: 1250
    },
    // 立委
    {
      id: 'legislator-1',
      name: '洪孟楷',
      title: '立法委員',
      region: '新北市第一選舉區',
      category: 'legislators',
      image: 'assets/images/politicians/hung-meng-kai.jpg',
      supportRate: 52,
      commentCount: 890
    },
    {
      id: 'legislator-2',
      name: '徐巧芯',
      title: '立法委員',
      region: '台北市第七選舉區',
      category: 'legislators',
      image: 'assets/images/politicians/hsu-chiao-hsin.jpg',
      supportRate: 48,
      commentCount: 756
    },
    {
      id: 'legislator-3',
      name: '葉元之',
      title: '立法委員',
      region: '新北市第十選舉區',
      category: 'legislators',
      image: 'assets/images/politicians/yeh-yuan-chih.jpg',
      supportRate: 41,
      commentCount: 634
    },
    // 市長
    {
      id: 'mayor-1',
      name: '蔣萬安',
      title: '台北市長',
      region: '台北市',
      category: 'mayors',
      image: 'assets/images/politicians/chiang-wan-an.jpg',
      supportRate: 58,
      commentCount: 1120
    },
    {
      id: 'mayor-2',
      name: '侯友宜',
      title: '新北市長',
      region: '新北市',
      category: 'mayors',
      image: 'assets/images/politicians/hou-yu-ih.jpg',
      supportRate: 62,
      commentCount: 980
    },
    // 縣市長
    {
      id: 'county-mayor-1',
      name: '張麗善',
      title: '雲林縣長',
      region: '雲林縣',
      category: 'county-mayors',
      image: 'assets/images/politicians/chang-li-shan.jpg',
      supportRate: 55,
      commentCount: 445
    },
    {
      id: 'county-mayor-2',
      name: '翁章梁',
      title: '嘉義縣長',
      region: '嘉義縣',
      category: 'county-mayors',
      image: 'assets/images/politicians/weng-chang-liang.jpg',
      supportRate: 49,
      commentCount: 332
    }
  ];

  constructor() { }

  ngOnInit(): void {
    this.filterPoliticians();
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.filterPoliticians();
  }

  filterPoliticians(): void {
    this.filteredPoliticians = this.politicians.filter(
      politician => politician.category === this.selectedCategory
    );
  }

  getCategoryIcon(category: string): string {
    const categoryObj = this.categories.find(c => c.id === category);
    return categoryObj ? categoryObj.icon : 'fas fa-user';
  }

  viewPoliticianDetail(politician: Politician): void {
    // 這裡可以導航到政治人物詳細頁面
    console.log('查看政治人物詳細信息:', politician);
    // 暫時顯示alert
    alert(`查看 ${politician.name} 的詳細分析`);
  }

  onImageError(event: any): void {
    // 當圖片載入失敗時，使用預設圖片
    event.target.src = 'assets/images/politicians/default-avatar.jpg';
  }
}
