export interface NavItem {
  name: string;
  url: string;
  icon: string;
  badge?: {
    variant: string;
    text: string;
  };
  isRecallAnalysis?: boolean; // 新增標識
}

export const navItems: NavItem[] = [
  {
    name: '2025立委罷免分析',
    url: '/taiwan-map',
    icon: 'fas fa-map',
    isRecallAnalysis: true // 標識為罷免分析
  },
  {
    name: '公投案分析',
    url: '/referendum-analysis',
    icon: 'fas fa-vote-yea'
  },
  {
    name: '政治人物分析',
    url: '/politicians',
    icon: 'fas fa-user-tie'
  },
  {
    name: '選舉分析',
    url: '/election-analysis',
    icon: 'fas fa-chart-line'
  }
];

export const navigationConfig = {
  mainNav: navItems,
  brand: {
    name: 'POI',
    fullName: 'Public Opinion Index',
    logo: 'fas fa-chart-line',
    url: '/'
  },
  stats: {
    enabled: true,
    showInHeader: true,
    showInFooter: true
  }
}; 