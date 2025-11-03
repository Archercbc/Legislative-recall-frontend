// 政治人物類型配置
export const POLITICIAN_TYPES = {
  legislator: '立法委員',
  mayor: '縣市長',
  councilor: '議員',
  minister: '部長',
  party_leader: '政黨領袖',
  politician: '政治人物',
  other: '其他'
};

// 政黨顏色配置
export const PARTY_COLORS: Record<string, string> = {
  '國民黨': '#000080',
  '民進黨': '#1B9431',
  '民眾黨': '#00B4AB',
  '時代力量': '#FFB500',
  '無黨籍': '#808080'
};

// 政治人物配置列表
export const politicians_config_list = [
  {
    "politician_id": "蔡志弘",
    "name": "蔡志弘",
    "target_type": "politician",
    "party": "國民黨",
    "partyColor": "#000080",
    "photo": "assets/蔡志弘.jpg",
  },
  {
    "politician_id": "卓伯源",
    "name": "卓伯源",
    "target_type": "politician",
    "party": "國民黨",
    "partyColor": "#000080",
    "photo": "assets/卓伯源.jpg",
  },
  {
    "politician_id": "張亞中",
    "name": "張亞中",
    "target_type": "politician",
    "party": "國民黨",
    "partyColor": "#000080",
    "photo": "assets/張亞中.jpg",
  },
  {
    "politician_id": "郝龍斌",
    "name": "郝龍斌",
    "target_type": "politician",
    "party": "國民黨",
    "partyColor": "#000080",
    "photo": "assets/郝龍斌.jpg",
  },
  {
    "politician_id": "羅智強",
    "name": "羅智強",
    "target_type": "politician",
    "party": "國民黨",
    "partyColor": "#000080",
    "photo": "assets/羅智強.jpg",
  },
  {
    "politician_id": "鄭麗文",
    "name": "鄭麗文",
    "target_type": "politician",
    "party": "國民黨",
    "partyColor": "#000080",
    "photo": "assets/鄭麗文.jpg",
  },
];

// 獲取政黨顏色
export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] || '#808080';
}

// 獲取政治人物類型文字
export function getPoliticianTypeText(type: string): string {
  return POLITICIAN_TYPES[type as keyof typeof POLITICIAN_TYPES] || '未知類型';
}

// 根據ID獲取政治人物配置
export function getPoliticianById(id: string) {
  return politicians_config_list.find(politician => politician.politician_id === id);
}

// 根據類型篩選政治人物
export function getPoliticiansByType(type: string) {
  if (type === 'all') return politicians_config_list;
  return politicians_config_list.filter(politician => politician.target_type === type);
}

// 根據政黨篩選政治人物
export function getPoliticiansByParty(party: string) {
  if (party === 'all') return politicians_config_list;
  return politicians_config_list.filter(politician => politician.party === party);
}

