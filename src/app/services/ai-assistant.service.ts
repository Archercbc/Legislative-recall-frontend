import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'guide' | 'progress' | 'plan' | 'general' | 'wordcloud' | 'emotion' | 'volume' | 'trend' | 'platform' | 'politician';
}

export interface ChatResponse {
  success: boolean;
  content?: string;
  category?: string;
  session_id?: string;
  user_id?: string;
  usage_info?: {
    daily_remaining: number;
    monthly_remaining: number;
    subscription_level: string;
  };
  error?: string;
  suggestions?: string[];
  limit_info?: any;
}

export interface UserStats {
  user_id: string;
  subscription_level: string;
  subscription_expires?: string;
  total_chat_count: number;
  daily_chat_count: number;
  monthly_chat_count: number;
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  total_cost: number;
  created_at: string;
  last_active: string;
}

export interface SystemStats {
  total_users: number;
  active_users: number;
  total_sessions: number;
  total_payments: number;
  total_revenue: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private apiUrl = environment.apiUrl || 'http://localhost:5001';
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  
  // 用戶統計數據
  private userStatsSubject = new BehaviorSubject<UserStats | null>(null);
  public userStats$ = this.userStatsSubject.asObservable();
  
  // 使用限制信息
  private usageInfoSubject = new BehaviorSubject<any>(null);
  public usageInfo$ = this.usageInfoSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeUser();
  }

  private initializeUser(): void {
    // 從localStorage獲取或創建用戶ID
    let userId = localStorage.getItem('ai_assistant_user_id');
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('ai_assistant_user_id', userId);
    }
    this.currentUserId = userId;
    
    // 從localStorage獲取會話ID
    this.currentSessionId = localStorage.getItem('ai_assistant_session_id');
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }

  /**
   * 發送聊天訊息
   */
  sendMessage(message: string): Observable<ChatResponse> {
    const payload = {
      message: message,
      user_id: this.currentUserId,
      session_id: this.currentSessionId
    };

    return new Observable(observer => {
      this.http.post<ChatResponse>(`${this.apiUrl}/web-ai/chat`, payload)
        .subscribe({
          next: (response) => {
            if (response.success) {
              // 保存會話ID
              if (response.session_id) {
                this.currentSessionId = response.session_id;
                localStorage.setItem('ai_assistant_session_id', response.session_id);
              }
              
              // 更新使用信息
              if (response.usage_info) {
                this.usageInfoSubject.next(response.usage_info);
              }
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('AI助手API錯誤:', error);
            observer.next({
              success: false,
              error: '網路連線錯誤，請稍後再試。'
            });
            observer.complete();
          }
        });
    });
  }

  /**
   * 獲取用戶統計
   */
  getUserStats(): Observable<UserStats | null> {
    if (!this.currentUserId) {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }

    return new Observable(observer => {
      this.http.get<{success: boolean, stats: UserStats}>(`${this.apiUrl}/web-ai/user/stats?user_id=${this.currentUserId}`)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.userStatsSubject.next(response.stats);
              observer.next(response.stats);
            } else {
              observer.next(null);
            }
            observer.complete();
          },
          error: (error) => {
            console.error('獲取用戶統計失敗:', error);
            observer.next(null);
            observer.complete();
          }
        });
    });
  }

  /**
   * 獲取系統統計
   */
  getSystemStats(): Observable<SystemStats | null> {
    return new Observable(observer => {
      this.http.get<{success: boolean, stats: SystemStats}>(`${this.apiUrl}/web-ai/system/stats`)
        .subscribe({
          next: (response) => {
            if (response.success) {
              observer.next(response.stats);
            } else {
              observer.next(null);
            }
            observer.complete();
          },
          error: (error) => {
            console.error('獲取系統統計失敗:', error);
            observer.next(null);
            observer.complete();
          }
        });
    });
  }

  /**
   * 重置用戶會話
   */
  resetSession(): void {
    this.currentSessionId = null;
    localStorage.removeItem('ai_assistant_session_id');
  }

  /**
   * 獲取當前用戶ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * 獲取當前會話ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 檢查是否為免費用戶
   */
  isFreeUser(): boolean {
    const usageInfo = this.usageInfoSubject.value;
    return !usageInfo || usageInfo.subscription_level === 'free';
  }

  /**
   * 獲取剩餘聊天次數
   */
  getRemainingChats(): { daily: number; monthly: number } {
    const usageInfo = this.usageInfoSubject.value;
    if (!usageInfo) {
      return { daily: 0, monthly: 0 };
    }
    return {
      daily: usageInfo.daily_remaining || 0,
      monthly: usageInfo.monthly_remaining || 0
    };
  }

  /**
   * 獲取訂閱等級
   */
  getSubscriptionLevel(): string {
    const usageInfo = this.usageInfoSubject.value;
    return usageInfo?.subscription_level || 'free';
  }

  /**
   * 格式化訂閱等級顯示
   */
  formatSubscriptionLevel(level: string): string {
    switch (level) {
      case 'free':
        return '免費版';
      case 'premium':
        return '進階版';
      case 'pro':
        return '專業版';
      default:
        return '免費版';
    }
  }

  /**
   * 獲取訂閱等級限制
   */
  getSubscriptionLimits(level: string): { daily: number; monthly: number } {
    switch (level) {
      case 'premium':
        return { daily: 50, monthly: 500 };
      case 'pro':
        return { daily: 200, monthly: 2000 };
      default:
        return { daily: 10, monthly: 100 };
    }
  }

  /**
   * 檢查是否需要升級
   */
  needsUpgrade(): boolean {
    const remaining = this.getRemainingChats();
    return remaining.daily <= 2 || remaining.monthly <= 20;
  }

  /**
   * 模擬付費升級（實際實現需要整合支付系統）
   */
  upgradeSubscription(level: 'premium' | 'pro'): Observable<boolean> {
    // 這裡應該整合實際的支付系統
    return new Observable(observer => {
      // 模擬支付成功
      setTimeout(() => {
        // 更新本地使用信息
        const currentUsage = this.usageInfoSubject.value;
        if (currentUsage) {
          const limits = this.getSubscriptionLimits(level);
          currentUsage.subscription_level = level;
          currentUsage.daily_remaining = limits.daily;
          currentUsage.monthly_remaining = limits.monthly;
          this.usageInfoSubject.next(currentUsage);
        }
        observer.next(true);
        observer.complete();
      }, 1000);
    });
  }

  /**
   * 處理文字雲點擊事件
   */
  handleWordcloudClick(keyword: string, legislatorName?: string): Observable<ChatResponse> {
    const message = legislatorName 
      ? `請解釋${legislatorName}的文字雲中「${keyword}」這個關鍵詞的含義和背景`
      : `請解釋文字雲中「${keyword}」這個關鍵詞的含義`;
    
    return this.sendMessage(message);
  }

  /**
   * 處理立委相關查詢
   */
  queryLegislator(legislatorName: string): Observable<ChatResponse> {
    const message = `請告訴我關於${legislatorName}的資訊和數據分析`;
    return this.sendMessage(message);
  }

  /**
   * 處理情緒分析查詢
   */
  queryEmotionAnalysis(legislatorName?: string): Observable<ChatResponse> {
    const message = legislatorName 
      ? `請分析${legislatorName}的情緒趨勢`
      : '請解釋情緒分析功能';
    
    return this.sendMessage(message);
  }

  /**
   * 處理聲量分析查詢
   */
  queryVolumeAnalysis(legislatorName?: string): Observable<ChatResponse> {
    const message = legislatorName 
      ? `請分析${legislatorName}的聲量趨勢`
      : '請解釋聲量分析功能';
    
    return this.sendMessage(message);
  }

  /**
   * 處理平台比較查詢
   */
  queryPlatformComparison(legislatorName?: string): Observable<ChatResponse> {
    const message = legislatorName 
      ? `請比較${legislatorName}在PTT、YouTube、Threads的討論差異`
      : '請解釋不同平台的數據差異';
    
    return this.sendMessage(message);
  }
} 