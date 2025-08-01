export interface NavItem {
  name: string;
  url: string;
  icon: string;
  badge?: {
    variant: string;
    text: string;
  };
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    name: '首頁',
    url: '/',
    icon: 'fas fa-home'
  },
  {
    name: '立委罷免分析',
    url: '/taiwan-map',
    icon: 'fas fa-map'
  },
  {
    name: '公投案分析',
    url: '/referendum-analysis',
    icon: 'fas fa-vote-yea'
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