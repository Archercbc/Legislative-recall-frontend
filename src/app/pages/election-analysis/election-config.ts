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
    "description": "分析比對2025年國民黨主席選舉的候選人聲量與情緒趨勢，並進行網路聲量分析。",
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