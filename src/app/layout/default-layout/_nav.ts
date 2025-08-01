export interface NavItem {
  name: string;
  url: string;
  icon: string;
  badge?: {
    variant: string;
    text: string;
  };
}

export const navItems: NavItem[] = [
  {
    name: '立委罷免分析',
    url: '/taiwan-map',
    icon: 'fas fa-map'
  },
  {
    name: '政治人物分析',
    url: '/politicians',
    icon: 'fas fa-user-tie'
  },
  {
    name: '公民議題分析',
    url: '/civic-issues',
    icon: 'fas fa-users'
  },
  {
    name: '公投案分析',
    url: '/referendum-analysis',
    icon: 'fas fa-vote-yea'
  },
  {
    name: '政策追蹤',
    url: '/policy-tracking',
    icon: 'fas fa-clipboard-list'
  },
  {
    name: '選舉分析',
    url: '/election-analysis',
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