// 立委事件標記點配置
export interface EventMarker {
  date: string;
  title: string;
  description: string;
  type: string;
  color: string;
  icon: string;
}

// 共同事件（所有立委都會看到）
export const COMMON_EVENTS: EventMarker[] = [
  // 普發一萬元現金事件
  {
    date: "2025-07-11",
    title: "立法院三讀通過普發一萬",
    description: "立法院於 7 月 11 日三讀通過全民普發一萬元現金。",
    type: "legislation_passed",
    color: "#4ECDC4",
    icon: "📜"
  },
  {
    date: "2025-08-01",
    title: "總統公告普發現金",
    description: "總統賴清德於 8 月 1 日正式公告確認普發一萬元現金。",
    type: "policy_announcement",
    color: "#FF6B6B",
    icon: "💰"
  },
  {
    date: "2025-08-29",
    title: "普發將於公布後 1 個月內啟動",
    description: "立法院三讀通過修正案，確定普發將於公布後 1 個月內啟動，7 個月內發放完畢，民眾最快 10 月可領取。",
    type: "budget_approval",
    color: "#FFD93D",
    icon: "📊"
  },
  {
    date: "2025-09-06",
    title: "普發現金外籍永居人士也可領取",
    description: "行政院長卓榮泰表示普發現金一萬元將比照過去發放模式，外籍永居人士也可領取，預算增加約 10 億元。",
    type: "policy_detail",
    color: "#45B7D1",
    icon: "🌍"
  },
  {
    date: "2025-10-01",
    title: "普發一萬元啟動",
    description: "普發現金正式發放，民眾可領取一萬元現金。",
    type: "implementation",
    color: "#FFA07A",
    icon: "🎉"
  },

  // 罷免與遊行事件
  {
    date: "2025-07-05",
    title: "雙北機車大掃街",
    description: "首波雙北機車大掃街登場，民眾以機車隊方式展開街頭活動。",
    type: "protest",
    color: "#FF6B6B",
    icon: "🏍️"
  },
  {
    date: "2025-07-25",
    title: "凱道路權反罷免",
    description: "國民黨成功搶下 7 月 25 日凱道的路權，舉行大型集會反罷免。",
    type: "protest",
    color: "#1E90FF",
    icon: "🚩"
  },
];

// 立委專屬事件
export const LEGISLATOR_SPECIFIC_EVENTS: { [key: string]: EventMarker[] } = {
  "洪孟楷": [
    // 洪孟楷的個人事件
  ],
  "徐巧芯": [
    // 徐巧芯的個人事件
  ],
  "王鴻薇": [
    // 王鴻薇的個人事件
  ]
};

// 獲取立委事件標記點
export function getPoliticianEvents(politicianName: string): EventMarker[] {
  let events: EventMarker[] = [];
  
  // 添加共同事件
  events = [...COMMON_EVENTS];
  
  // 添加立委專屬事件
  if (LEGISLATOR_SPECIFIC_EVENTS[politicianName]) {
    events = [...events, ...LEGISLATOR_SPECIFIC_EVENTS[politicianName]];
  }
  
  // 按日期排序
  events.sort((a, b) => a.date.localeCompare(b.date));
  
  return events;
}

// 根據時間範圍過濾事件
export function filterEventsByDateRange(events: EventMarker[], startDate: string, endDate: string): EventMarker[] {
  return events.filter(event => {
    if (startDate && event.date < startDate) return false;
    if (endDate && event.date > endDate) return false;
    return true;
  });
}

// 根據天數過濾事件
export function filterEventsByDays(events: EventMarker[], days: number): EventMarker[] {
  // 如果天數大於等於365天，顯示所有事件
  if (days >= 365) {
    return events;
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log('📌 過濾日期範圍:', startDate, '到', endDate);

  return filterEventsByDateRange(events, startDate, endDate);
}