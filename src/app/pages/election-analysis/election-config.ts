// 統一的狀態顏色配置 - 使用十六進制顏色代碼
export const STATUS_COLORS: Record<string, string> = {
  // 英文狀態對應
  completed: '#28a745',   // 綠色 - 已完成
  in_process: '#17a2b8',  // 藍色 - 進行中
  pending: '#ffc107',     // 橘色 - 等待中
  error: '#dc3545',       // 紅色 - 錯誤
  canceled: '#6c757d',    // 灰色 - 取消
  done: '#6c757d',        // 灰色 - 已結束
  upcoming: '#ffc107',    // 橘色 - 即將舉行
  ongoing: '#17a2b8',     // 藍色 - 進行中
};

// 選舉類型配置
export const ELECTION_TYPES = {
  presidential: '總統選舉',
  legislative: '立委選舉', 
  local: '地方選舉',
  party_leadership: '政黨選舉',
  referendum: '公投'
};

// 選舉事件配置列表
export const election_config_list = [
  {
    "election_id": "kmt-chairman-2025",
    "title": "國民黨主席選舉 (2025)",
    "subtitle": "KMT Chairman Election Analysis (2025)",
    "type": "party_leadership",
    "status": "completed",
    "start_date": "2025-07-31",
    "end_date": "2025-10-18",
    "description": "分析比對2025年國民黨主席選舉的候選人網友數與情緒趨勢，並進行網路網友數分析。",
    "tags": ["國民黨", "主席選舉", "2025"],
    "key_issues": [],
    "candidates": [
      {
        "id": "zheng_li_wen",
        "name": "鄭麗文",
        "party": "國民黨",
        "partyColor": "#000080",
        "photo": "assets/鄭麗文.jpg"
      },
      {
        "id": "luo_zhi_qiang",
        "name": "羅智強",
        "party": "國民黨",
        "partyColor": "#000080",
        "photo": "assets/羅智強.jpg"
      },
      {
        "id": "zhang_ya_zhong",
        "name": "張亞中",
        "party": "國民黨",
        "partyColor": "#000080",
        "photo": "assets/張亞中.jpg"
      },
      {
        "id": "hao_long_bin",
        "name": "郝龍斌",
        "party": "國民黨",
        "partyColor": "#000080",
        "photo": "assets/郝龍斌.jpg"
      },
      {
        "id": "zhuo_bo_yuan",
        "name": "卓伯源",
        "party": "國民黨",
        "partyColor": "#000080",
        "photo": "assets/卓伯源.jpg"
      },
      {
        "id": "cai_zhi_hong",
        "name": "蔡志弘",
        "party": "國民黨",
        "partyColor": "#000080",
        "photo": "assets/蔡志弘.jpg"
      }
    ]
  },
   {
    "election_id": "local-2026",
    "title": "2026 縣市長選舉",
    "subtitle": "2026 Local Elections Analysis",
    "type": "local",
    "status": "ongoing",
    "start_date": "2026-06-01",
    "end_date": "2026-11-28",
    "description": "分析比對2026年全台縣市長候選人之網路聲量、情緒趨勢與社群討論度。",
    "candidates": [
      { "id": "chiang-wan-an", "name": "蔣萬安", "party": "國民黨", "partyColor": "#000080", "city": "taipei-city", "photo": "/assets/candidates/蔣萬安.jpg" },
      { "id": "pua-shen-po", "name": "沈伯洋", "party": "民進黨", "partyColor": "#1B9431", "city": "taipei-city", "photo": "/assets/candidates/沈伯洋.jpg" },
      { "id": "kuo-hsi", "name": "郭璽", "party": "麻將最大黨", "partyColor": "#EA580C", "city": "taipei-city", "photo": "/assets/candidates/郭璽.jpg" },
      { "id": "lee-sichuan", "name": "李四川", "party": "國民黨", "partyColor": "#000080", "city": "new-taipei-city", "photo": "/assets/candidates/李四川.jpg" },
      { "id": "su-chiao-hui", "name": "蘇巧慧", "party": "民進黨", "partyColor": "#1B9431", "city": "new-taipei-city", "photo": "/assets/candidates/蘇巧慧.jpg" },
      { "id": "tong-zi-wei", "name": "童子瑋", "party": "民進黨", "partyColor": "#1B9431", "city": "keelung-city", "photo": "/assets/candidates/童子瑋.jpg" },
      { "id": "hsieh-kuo-liang", "name": "謝國樑", "party": "國民黨", "partyColor": "#000080", "city": "keelung-city", "photo": "/assets/candidates/謝國樑.jpg" },
      { "id": "huang-shi-jie", "name": "黃世杰", "party": "民進黨", "partyColor": "#1B9431", "city": "taoyuan-city", "photo": "/assets/candidates/黃世杰.jpg" },
      { "id": "chang-shan-cheng", "name": "張善政", "party": "國民黨", "partyColor": "#000080", "city": "taoyuan-city", "photo": "/assets/candidates/張善政.jpg" },
      { "id": "zheng-chao-fang", "name": "鄭朝方", "party": "民進黨", "partyColor": "#1B9431", "city": "hsinchu-county", "photo": "/assets/candidates/鄭朝方.jpg" },
      { "id": "hsu-hsin-ying", "name": "徐欣瑩", "party": "國民黨", "partyColor": "#000080", "city": "hsinchu-county", "photo": "/assets/candidates/徐欣瑩.jpg" },
      { "id": "zhuang-jing-cheng", "name": "莊競程", "party": "民進黨", "partyColor": "#1B9431", "city": "hsinchu-city", "photo": "/assets/candidates/莊競程.jpg" },
      { "id": "kao-hung-an", "name": "高虹安", "party": "無黨籍", "partyColor": "#28C8C8", "city": "hsinchu-city", "photo": "/assets/candidates/高虹安.jpg" },
      { "id": "ho-chih-yung", "name": "何志勇", "party": "國民黨", "partyColor": "#000080", "city": "hsinchu-city", "photo": "/assets/candidates/何志勇.jpg" },
      { "id": "chen-pin-an", "name": "陳品安", "party": "民進黨", "partyColor": "#1B9431", "city": "miaoli-county", "photo": "/assets/candidates/陳品安.jpg" },
      { "id": "chung-tung-chin", "name": "鍾東錦", "party": "國民黨", "partyColor": "#000080", "city": "miaoli-county", "photo": "/assets/candidates/鍾東錦.jpg" },
      { "id": "ho-hsin-chun", "name": "何欣純", "party": "民進黨", "partyColor": "#1B9431", "city": "taichung-city", "photo": "/assets/candidates/何欣純.jpg" },
      { "id": "chiang-chi-chen", "name": "江啟臣", "party": "國民黨", "partyColor": "#000080", "city": "taichung-city", "photo": "/assets/candidates/江啟臣.jpg" },
      { "id": "chen-su-yueh", "name": "陳素月", "party": "民進黨", "partyColor": "#1B9431", "city": "changhua-county", "photo": "/assets/candidates/陳素月.jpg" },
      { "id": "wei-ping-cheng", "name": "魏平政", "party": "國民黨", "partyColor": "#000080", "city": "changhua-county", "photo": "/assets/candidates/魏平政.jpg" },
      { "id": "chiu-chien-fu", "name": "邱建富", "party": "無黨籍", "partyColor": "#64748B", "city": "changhua-county", "photo": "/assets/candidates/邱建富.jpg" },
      { "id": "wen-shih-cheng", "name": "溫世政", "party": "民進黨", "partyColor": "#1B9431", "city": "nantou-county", "photo": "/assets/candidates/溫世政.jpg" },
      { "id": "hsu-shu-hua", "name": "許淑華", "party": "國民黨", "partyColor": "#000080", "city": "nantou-county", "photo": "/assets/candidates/許淑華.jpg" },
      { "id": "liu-chien-kuo", "name": "劉建國", "party": "民進黨", "partyColor": "#1B9431", "city": "yunlin-county", "photo": "/assets/candidates/劉建國.jpg" },
      { "id": "chang-chia-chun", "name": "張嘉郡", "party": "國民黨", "partyColor": "#000080", "city": "yunlin-county", "photo": "/assets/candidates/張嘉郡.jpg" },
      { "id": "tsai-yi-yu", "name": "蔡易餘", "party": "民進黨", "partyColor": "#1B9431", "city": "chiayi-county", "photo": "/assets/candidates/蔡易餘.jpg" },
      { "id": "wu-pin-jui", "name": "吳品叡", "party": "無黨籍", "partyColor": "#64748B", "city": "chiayi-county", "photo": "/assets/candidates/吳品叡.jpg" },
      { "id": "wang-mei-hui", "name": "王美惠", "party": "民進黨", "partyColor": "#1B9431", "city": "chiayi-city", "photo": "/assets/candidates/王美惠.jpg" },
      { "id": "chang-chi-kai", "name": "張啓楷", "party": "民眾黨", "partyColor": "#28C8C8", "city": "chiayi-city", "photo": "/assets/candidates/張啓楷.jpg" },
      { "id": "chen-ting-fei", "name": "陳亭妃", "party": "民進黨", "partyColor": "#1B9431", "city": "tainan-city", "photo": "/assets/candidates/陳亭妃.jpg" },
      { "id": "hsieh-lung-chieh", "name": "謝龍介", "party": "國民黨", "partyColor": "#000080", "city": "tainan-city", "photo": "/assets/candidates/謝龍介.jpg" },
      { "id": "lai-jui-lung", "name": "賴瑞隆", "party": "民進黨", "partyColor": "#1B9431", "city": "kaohsiung-city", "photo": "/assets/candidates/賴瑞隆.jpg" },
      { "id": "ko-chih-en", "name": "柯志恩", "party": "國民黨", "partyColor": "#000080", "city": "kaohsiung-city", "photo": "/assets/candidates/柯志恩.jpg" },
      { "id": "chang-ching", "name": "張靜", "party": "司法改革黨", "partyColor": "#64748B", "city": "kaohsiung-city", "photo": "/assets/candidates/張靜.jpg" },
      { "id": "chou-chun-mi", "name": "周春米", "party": "民進黨", "partyColor": "#1B9431", "city": "pingtung-county", "photo": "/assets/candidates/周春米.jpg" },
      { "id": "su-ching-chuan", "name": "蘇清泉", "party": "國民黨", "partyColor": "#000080", "city": "pingtung-county", "photo": "/assets/candidates/蘇清泉.jpg" },
      { "id": "lin-kuo-chang", "name": "林國漳", "party": "民進黨", "partyColor": "#1B9431", "city": "yilan-county", "photo": "/assets/candidates/林國漳.jpg" },
      { "id": "wu-tsung-hsien", "name": "吳宗憲", "party": "國民黨", "partyColor": "#000080", "city": "yilan-county", "photo": "/assets/candidates/吳宗憲.jpg" },
      { "id": "yu-shu-chen", "name": "游淑貞", "party": "國民黨", "partyColor": "#000080", "city": "hualien-county", "photo": "/assets/candidates/游淑貞.jpg" },
      { "id": "chang-chun", "name": "張峻", "party": "無黨籍", "partyColor": "#64748B", "city": "hualien-county", "photo": "/assets/candidates/張峻.jpg" },
      { "id": "wei-chia-hsien", "name": "魏嘉賢", "party": "無黨籍", "partyColor": "#64748B", "city": "hualien-county", "photo": "/assets/candidates/魏嘉賢.jpg" },
      { "id": "lo-pei-chin", "name": "羅佩秦", "party": "無黨籍", "partyColor": "#64748B", "city": "hualien-county", "photo": "/assets/candidates/羅佩秦.jpg" },
      { "id": "chen-ying", "name": "陳瑩", "party": "民進黨", "partyColor": "#1B9431", "city": "taitung-county", "photo": "/assets/candidates/陳瑩.jpg" },
      { "id": "wu-hsiu-hua", "name": "吳秀華", "party": "國民黨", "partyColor": "#000080", "city": "taitung-county", "photo": "/assets/candidates/吳秀華.jpg" },
      { "id": "liu-chao-hao", "name": "劉櫂豪", "party": "無黨籍", "partyColor": "#64748B", "city": "taitung-county", "photo": "/assets/candidates/劉櫂豪.jpg" },
      { "id": "li-wu-ying-chih", "name": "李吳穎智", "party": "無黨籍", "partyColor": "#64748B", "city": "taitung-county", "photo": "/assets/candidates/李吳穎智.jpg" },
      { "id": "wu-shu-chin", "name": "吳淑瑾", "party": "民進黨", "partyColor": "#1B9431", "city": "penghu-county", "photo": "/assets/candidates/吳淑瑾.jpg" },
      { "id": "chen-chen-chung", "name": "陳振中", "party": "國民黨", "partyColor": "#000080", "city": "penghu-county", "photo": "/assets/candidates/陳振中.jpg" },
      { "id": "yeh-chu-lin", "name": "葉竹林", "party": "無黨籍", "partyColor": "#64748B", "city": "penghu-county", "photo": "/assets/candidates/葉竹林.jpg" },
      { "id": "chou-ni-an", "name": "周倪安", "party": "台灣團結聯盟", "partyColor": "#C89600", "city": "penghu-county", "photo": "/assets/candidates/周倪安.jpg" },
      { "id": "chen-chin-chuan", "name": "陳盡川", "party": "無黨籍", "partyColor": "#64748B", "city": "penghu-county", "photo": "/assets/candidates/陳盡川.jpg" },
      { "id": "chen-yu-chen", "name": "陳玉珍", "party": "國民黨", "partyColor": "#000080", "city": "kinmen-county", "photo": "/assets/candidates/陳玉珍.jpg" },
      { "id": "lee-wen-liang", "name": "李文良", "party": "無黨籍", "partyColor": "#64748B", "city": "kinmen-county", "photo": "/assets/candidates/李文良.jpg" },
      { "id": "wang-chung-ming", "name": "王忠銘", "party": "國民黨", "partyColor": "#000080", "city": "lienchiang-county", "photo": "/assets/candidates/王忠銘.jpg" }
    ],
    "coming_soon": false,
    "disabled": false
  }
]

// 獲取狀態顏色
export function getStatusClass(status?: string): string {
  if (!status) return '#17a2b8';
  return STATUS_COLORS[status] || '#17a2b8';
}

// 獲取選舉類型文字
export function getElectionTypeText(type: string): string {
  return ELECTION_TYPES[type as keyof typeof ELECTION_TYPES] || '未知類型';
}

// 根據ID獲取選舉配置
export function getElectionById(id: string) {
  return election_config_list.find(election => election.election_id === id);
}

// 根據類型篩選選舉
export function getElectionsByType(type: string) {
  if (type === 'all') return election_config_list;
  return election_config_list.filter(election => election.type === type);
}

// 根據狀態篩選選舉
export function getElectionsByStatus(status: string) {
  if (status === 'all') return election_config_list;
  return election_config_list.filter(election => election.status === status);
}