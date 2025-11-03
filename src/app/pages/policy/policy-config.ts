// 政策狀態顏色配置
export const POLICY_STATUS_COLORS: Record<string, string> = {
  planning: '#17a2b8',      // 藍色 - 規劃中
  in_process: '#ffc107',    // 橘色 - 執行中
  completed: '#28a745',     // 綠色 - 已完成
  suspended: '#dc3545',     // 紅色 - 暫停
  canceled: '#6c757d',      // 灰色 - 取消
};

// 政策類型配置
export const POLICY_TYPES = {
  economy: '經濟政策',
  other: '其他'
};

// 政策配置列表
export const policy_config_list = [
  {
    "policy_id": "cash-subsidy-10000",
    "title": "普發現金 10000 元",
    "subtitle": "Cash Subsidy 10000 NTD",
    "eventName": "普發10000",  // 後端資料庫中的實際事件名稱
    "type": "economy",
    "status": "completed",
    "start_date": "2023-01-01",
    "end_date": "2023-12-31",
    "description": "全民普發現金新台幣 10,000 元政策，分析網路討論聲量、情緒分布與關鍵議題。",
    "tags": ["經濟", "現金發放", "2023"],
    "key_issues": ["發放方式", "資格認定", "財政負擔", "經濟效益"],
    "related_departments": ["財政部", "行政院"],
    "budget": "1400億",
    "beneficiaries": "全體國民"
  },
];

// 獲取狀態顏色
export function getPolicyStatusClass(status?: string): string {
  if (!status) return '#17a2b8';
  return POLICY_STATUS_COLORS[status] || '#17a2b8';
}

// 獲取政策類型文字
export function getPolicyTypeText(type: string): string {
  return POLICY_TYPES[type as keyof typeof POLICY_TYPES] || '未知類型';
}

// 根據ID獲取政策配置
export function getPolicyById(id: string) {
  return policy_config_list.find(policy => policy.policy_id === id);
}

// 根據類型篩選政策
export function getPoliciesByType(type: string) {
  if (type === 'all') return policy_config_list;
  return policy_config_list.filter(policy => policy.type === type);
}

// 根據狀態篩選政策
export function getPoliciesByStatus(status: string) {
  if (status === 'all') return policy_config_list;
  return policy_config_list.filter(policy => policy.status === status);
}

