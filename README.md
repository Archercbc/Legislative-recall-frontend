# 社交媒體分析系統 - 前端

![專案狀態](https://img.shields.io/badge/狀態-活躍開發-green)
![Angular版本](https://img.shields.io/badge/Angular-19.2.12-blue)
![授權](https://img.shields.io/badge/授權-MIT-green)

> 基於 Angular 19 的現代化前端應用，提供立委罷免分析、政治人物輿情追蹤、政策議題分析與選舉數據視覺化等完整功能。

## 📋 目錄

- [專案概述](#專案概述)
- [技術架構](#技術架構)
- [頁面結構](#頁面結構)
- [核心功能](#核心功能)
- [安裝指南](#安裝指南)
- [開發指南](#開發指南)
- [API 整合](#api-整合)
- [部署說明](#部署說明)

## 🎯 專案概述

本前端應用是社交媒體分析系統的使用者介面，採用 Angular 19 框架構建，提供直觀的資料視覺化與互動式分析工具。系統主要服務於台灣政治輿情分析，包含立委罷免追蹤、政治人物聲量分析、政策議題監控與選舉數據分析等功能。

### 核心特色

- **📊 資料視覺化**: 使用 Chart.js 與 ng2-charts 提供豐富的圖表展示
- **🗺️ 互動式地圖**: 台灣地圖視覺化展示立委罷免分析
- **🤖 AI 整合**: 內建 AI 聊天助手，提供文字雲詞彙解釋功能
- **📱 響應式設計**: 支援多種裝置與螢幕尺寸
- **⚡ 高效能**: 採用 Angular 19 最新特性，優化載入速度與使用者體驗

## 🛠️ 技術架構

### 核心框架與套件

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Angular | 19.2.12 | 主要前端框架 |
| **UI 框架** | CoreUI | 5.2.13 | 管理後台 UI 組件 |
| **圖表** | Chart.js | 4.4.0 | 資料視覺化 |
| | ng2-charts | 5.0.0 | Angular Chart.js 整合 |
| **地圖** | @svg-maps/taiwan | 1.1.0 | 台灣地圖 SVG |
| **文字雲** | angular-tag-cloud-module | 19.0.0 | 文字雲視覺化 |
| **樣式** | Bootstrap Icons | 1.13.1 | 圖示庫 |
| **HTTP** | Angular HttpClient | 19.2.12 | API 通訊 |

### 專案結構

```
frontend/
├── src/
│   ├── app/
│   │   ├── pages/                    # 頁面組件
│   │   │   ├── home/                 # 首頁
│   │   │   ├── legislators/          # 立委相關頁面
│   │   │   │   ├── taiwan-map/       # 台灣地圖（罷免分析）
│   │   │   │   └── legislators-detail/ # 立委詳情頁
│   │   │   ├── politicians/          # 政治人物頁面
│   │   │   │   ├── politician/       # 政治人物列表
│   │   │   │   └── politicians-analysis/ # 政治人物分析
│   │   │   ├── policy/               # 政策議題頁面
│   │   │   │   ├── policy-list/      # 政策列表
│   │   │   │   └── policy-tracking/  # 政策追蹤詳情
│   │   │   ├── election-analysis/    # 選舉分析頁面
│   │   │   │   ├── election-list/   # 選舉列表
│   │   │   │   └── election-detail/ # 選舉詳情
│   │   │   └── web-ai-assistant/     # AI 聊天助手
│   │   ├── services/                 # 服務層
│   │   │   ├── data.service.ts       # 資料服務
│   │   │   ├── election.service.ts   # 選舉服務
│   │   │   ├── visitor.service.ts    # 訪問統計服務
│   │   │   └── ai-chat.service.ts    # AI 聊天服務
│   │   ├── layout/                   # 佈局組件
│   │   │   └── default-layout/        # 預設佈局
│   │   ├── app.routes.ts             # 路由配置
│   │   └── app.component.ts          # 根組件
│   ├── environments/                 # 環境配置
│   └── assets/                       # 靜態資源
├── angular.json                       # Angular 配置
├── package.json                      # 依賴管理
└── tsconfig.json                     # TypeScript 配置
```

## 📄 頁面結構

### 1. 首頁 (Home)

**路徑**: `/`

**功能說明**:
- 系統總覽與統計資訊展示
- 訪問統計數據顯示（總訪問量、今日訪客）
- 快速導航至各功能模組
- 立委輿情分析數量統計

**呈現方式**:
- 卡片式佈局展示關鍵指標
- 即時更新訪問統計（每 30 秒自動刷新）
- 響應式設計，適配各種螢幕尺寸

**技術實現**:
- 使用 `VisitorService` 獲取訪問統計
- 透過 `DataService` 獲取系統數據
- 自動定時更新機制

### 2. 台灣地圖 - 立委罷免分析 (Taiwan Map)

**路徑**: `/taiwan-map`

**功能說明**:
- 互動式台灣地圖視覺化
- 展示各選區立委罷免狀態
- 支援縣市與黨派篩選
- 顯示選區立委數量統計
- 點擊地圖區域查看詳細資訊

**呈現方式**:
- SVG 台灣地圖，支援區域點擊互動
- 顏色編碼顯示不同狀態（進行中、已完成、未啟動）
- 側邊欄顯示篩選條件與統計數據
- 彈出視窗展示選區立委詳細列表

**技術實現**:
- 使用 `@svg-maps/taiwan` 提供地圖 SVG
- 動態載入立委數據並標記在地圖上
- 支援縣市與黨派雙重篩選
- 響應式地圖縮放與視圖調整

**核心功能**:
- 地圖區域點擊事件處理
- 立委數據即時載入與更新
- 選區統計計算與展示
- 罷免狀態視覺化標記

### 3. 立委詳情頁 (Legislator Detail)

**路徑**: `/legislator/:legislatorId`

**功能說明**:
- 單一立委完整資料展示
- 時間序列統計圖表（7/14/30/90/180/365 天）
- 情感分析結果視覺化
- 文字雲展示關鍵詞彙
- 平台分析（YouTube、PTT、Threads、Facebook）
- 事件時間軸展示

**呈現方式**:
- 多標籤頁設計，分類展示不同數據
- 互動式圖表（折線圖、圓餅圖、長條圖）
- 文字雲動態渲染
- 時間範圍選擇器（7/14/30/90/180/365 天、全部）
- 響應式卡片佈局

**技術實現**:
- Chart.js 圖表整合
- 文字雲模組動態生成
- 時間序列數據處理與視覺化
- 多平台數據聚合展示

### 4. 政治人物列表 (Politicians List)

**路徑**: `/politicians`

**功能說明**:
- 所有政治人物列表展示
- 搜尋與篩選功能
- 快速導航至個別分析頁面

**呈現方式**:
- 卡片式列表佈局
- 搜尋框即時過濾
- 點擊卡片跳轉至詳情頁

### 5. 政治人物分析 (Politicians Analysis)

**路徑**: `/politicians-analysis/:politicianName`

**功能說明**:
- 政治人物完整輿情分析
- 時間序列聲量趨勢
- 情感分析統計
- 平台分布分析
- 關鍵詞文字雲
- 相關事件追蹤

**呈現方式**:
- 與立委詳情頁類似的多標籤頁設計
- 圖表與數據並重展示
- 時間範圍選擇功能
- 互動式數據探索

### 6. 政策議題列表 (Policy List)

**路徑**: `/policy`

**功能說明**:
- 所有政策議題列表
- 議題狀態分類（進行中、已完成、已結束）
- 聲量統計與情感分析總覽

**呈現方式**:
- 表格或卡片式列表
- 排序與篩選功能
- 快速查看關鍵指標

### 7. 政策議題追蹤 (Policy Tracking)

**路徑**: `/policy-tracking/:policyId`

**功能說明**:
- 單一政策議題詳細追蹤
- 時間序列聲量變化
- 情感分析趨勢
- 相關討論平台分析
- 關鍵事件時間軸

**呈現方式**:
- 多維度數據視覺化
- 時間軸展示重要事件
- 圖表與統計數據整合

### 8. 選舉分析列表 (Election List)

**路徑**: `/election-analysis`

**功能說明**:
- 所有選舉分析專案列表
- 候選人對比分析入口
- 選舉數據總覽

**呈現方式**:
- 列表式佈局
- 快速導航至詳細分析

### 9. 選舉分析詳情 (Election Detail)

**路徑**: `/election-analysis/:id`

**功能說明**:
- 多候選人對比分析
- 時間序列聲量對比
- 平台分布比較
- 情感分析對比
- 關鍵事件影響分析

**呈現方式**:
- 多候選人數據並列展示
- 對比圖表（群組長條圖、多線折線圖）
- 互動式數據篩選

### 10. AI 聊天助手 (Web AI Assistant)

**路徑**: 整合於各頁面（可選）

**功能說明**:
- 智能對話助手
- 文字雲詞彙解釋
- 立委與政策相關問題回答
- 網站功能導覽

**呈現方式**:
- 浮動聊天視窗
- 對話式介面
- 支援 Markdown 格式回應

## 🚀 核心功能

### 1. 資料視覺化系統

**圖表類型**:
- **折線圖**: 時間序列趨勢分析
- **圓餅圖**: 平台分布、情感分布
- **長條圖**: 統計數據對比
- **文字雲**: 關鍵詞彙視覺化

**技術實現**:
```typescript
// 使用 ng2-charts 整合 Chart.js
import { ChartConfiguration, ChartData } from 'ng2-charts';

// 圖表配置範例
chartOptions: ChartConfiguration['options'] = {
  responsive: true,
  plugins: {
    legend: { display: true },
    tooltip: { enabled: true }
  }
};
```

### 2. 互動式地圖系統

**功能特性**:
- SVG 地圖區域點擊事件
- 動態數據標記
- 區域統計計算
- 響應式縮放

**技術實現**:
```typescript
// 使用 @svg-maps/taiwan
import taiwan from '@svg-maps/taiwan';

// 地圖點擊處理
onMapClick(event: MouseEvent, area: string) {
  this.selectedCounty = area;
  this.loadLegislatorsByArea(area);
}
```

### 3. API 整合層

**服務架構**:
- `DataService`: 立委數據 API
- `ElectionService`: 選舉分析 API
- `VisitorService`: 訪問統計 API
- `AiChatService`: AI 聊天 API

**錯誤處理**:
- 統一的 HTTP 攔截器
- 錯誤訊息標準化
- 重試機制

### 4. 狀態管理

**實現方式**:
- Angular 服務注入
- RxJS Observable 數據流
- 組件間數據共享

### 5. 響應式設計

**斷點設定**:
- 手機: < 768px
- 平板: 768px - 1024px
- 桌面: > 1024px

**適配策略**:
- Flexbox 與 Grid 佈局
- 媒體查詢
- 動態組件載入

## 📦 安裝指南

### 系統需求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Angular CLI**: 19.x

### 快速安裝

```bash
# 1. 進入前端目錄
cd frontend

# 2. 安裝依賴套件
npm install

# 3. 配置環境變數
# 編輯 src/environments/environment.ts
# 設定 API 端點 URL

# 4. 啟動開發伺服器
npm start
# 或
ng serve

# 5. 開啟瀏覽器訪問
# http://localhost:4200
```

### 環境配置

編輯 `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5001'  // 後端 API 地址
};
```

### 建置生產版本

```bash
# 建置生產版本
npm run build

# 輸出目錄: dist/legislative-recall
```

## 🔧 開發指南

### 新增頁面

1. **生成組件**:
```bash
ng generate component pages/new-page
```

2. **配置路由**:
```typescript
// app.routes.ts
import { NewPageComponent } from './pages/new-page/new-page.component';

export const routes: Routes = [
  { path: 'new-page', component: NewPageComponent }
];
```

3. **添加導航項目**:
```typescript
// layout/default-layout/_nav.ts
export const navItems: NavItem[] = [
  {
    name: '新頁面',
    url: '/new-page',
    icon: 'fas fa-icon'
  }
];
```

### 新增服務

```bash
ng generate service services/new-service
```

### 使用圖表

```typescript
import { ChartConfiguration } from 'ng2-charts';

export class MyComponent {
  chartData: ChartConfiguration['data'] = {
    labels: ['A', 'B', 'C'],
    datasets: [{
      data: [10, 20, 30],
      label: '數據集'
    }]
  };
}
```

### 呼叫 API

```typescript
import { DataService } from '../services/data.service';

export class MyComponent {
  constructor(private dataService: DataService) {}

  loadData() {
    this.dataService.getLegislators()
      .subscribe(data => {
        // 處理數據
      });
  }
}
```

## 🔌 API 整合

### 後端 API 端點

| 功能 | 端點 | 方法 | 說明 |
|------|------|------|------|
| 立委列表 | `/api/legislators/` | GET | 獲取所有立委 |
| 立委詳情 | `/api/legislators/:id` | GET | 獲取單一立委資料 |
| 立委數據 | `/api/legislators/:id/data` | GET | 獲取立委完整數據 |
| 政治人物列表 | `/api/politicians/` | GET | 獲取所有政治人物 |
| 政治人物詳情 | `/api/politicians/:id` | GET | 獲取單一政治人物資料 |
| 事件列表 | `/api/events/` | GET | 獲取所有事件 |
| 事件詳情 | `/api/events/:name` | GET | 獲取單一事件資料 |
| 選舉分析 | `/api/election/analysis` | GET | 獲取選舉分析數據 |
| 訪問統計 | `/api/visitor/stats` | GET | 獲取訪問統計 |
| AI 聊天 | `/api/ai/chat` | POST | AI 對話 |
| 詞彙解釋 | `/api/ai/explain-word` | POST | 解釋文字雲詞彙 |

### 請求範例

```typescript
// 獲取立委列表
this.dataService.getLegislators(county, party)
  .subscribe(legislators => {
    console.log(legislators);
  });

// 獲取立委詳情
this.dataService.getLegislatorDetail('葉元之')
  .subscribe(detail => {
    console.log(detail);
  });
```

### 錯誤處理

```typescript
this.dataService.getLegislators()
  .pipe(
    catchError(error => {
      console.error('API 錯誤:', error);
      return of([]); // 返回預設值
    })
  )
  .subscribe(data => {
    // 處理數據
  });
```

## 🚀 部署說明

### Netlify 部署

1. **建置專案**:
```bash
npm run build
```

2. **配置 netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist/legislative-recall"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. **環境變數設定**:
- 在 Netlify 後台設定 `API_URL` 環境變數

### 其他平台

**Vercel**:
```bash
vercel --prod
```

**GitHub Pages**:
```bash
ng build --base-href=/your-repo-name/
```

## 📝 開發注意事項

### 程式碼規範

- 使用 TypeScript 嚴格模式
- 遵循 Angular 風格指南
- 組件使用 standalone 模式
- 服務使用 `providedIn: 'root'`

### 效能優化

- 使用 OnPush 變更檢測策略
- 實作虛擬滾動（長列表）
- 圖片懶載入
- 路由懶載入

### 測試

```bash
# 單元測試
npm test

# E2E 測試（如已配置）
npm run e2e
```

## 🔗 相關資源

- [Angular 官方文件](https://angular.io/docs)
- [Chart.js 文件](https://www.chartjs.org/docs/)
- [CoreUI 文件](https://coreui.io/angular/docs/)
- [ng2-charts 文件](https://valor-software.com/ng2-charts/)

## 📄 授權

MIT License
