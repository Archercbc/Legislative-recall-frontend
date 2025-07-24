import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  error?: string;
}

export interface WordExplanationResponse {
  success: boolean;
  word?: string;
  legislator?: string;
  explanation?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private apiUrl = environment.apiUrl || 'http://localhost:5001';
  private currentUserId: string | null = null;
  
  // 聊天歷史
  private chatHistorySubject = new BehaviorSubject<ChatMessage[]>([]);
  public chatHistory$ = this.chatHistorySubject.asObservable();

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
      user_id: this.currentUserId
    };

    // 添加用戶訊息到歷史記錄
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    this.addToChatHistory(userMessage);

    return new Observable(observer => {
      this.http.post<ChatResponse>(`${this.apiUrl}/api/ai/chat`, payload)
        .subscribe({
          next: (response) => {
            if (response.success && response.message) {
              // 添加AI回應到歷史記錄
              const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: response.message,
                timestamp: new Date()
              };
              this.addToChatHistory(assistantMessage);
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
   * 解釋文字雲詞彙
   */
  explainWord(word: string, legislatorName?: string): Observable<WordExplanationResponse> {
    const payload = {
      word: word,
      legislator_name: legislatorName
    };

    return new Observable(observer => {
      this.http.post<WordExplanationResponse>(`${this.apiUrl}/api/ai/explain-word`, payload)
        .subscribe({
          next: (response) => {
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('詞彙解釋API錯誤:', error);
            observer.next({
              success: false,
              error: '無法解釋詞彙，請稍後再試。'
            });
            observer.complete();
          }
        });
    });
  }

  /**
   * 檢查AI服務健康狀態
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/ai/health`);
  }

  /**
   * 添加訊息到聊天歷史
   */
  private addToChatHistory(message: ChatMessage): void {
    const currentHistory = this.chatHistorySubject.value;
    const newHistory = [...currentHistory, message];
    this.chatHistorySubject.next(newHistory);
  }

  /**
   * 清空聊天歷史
   */
  clearChatHistory(): void {
    this.chatHistorySubject.next([]);
  }

  /**
   * 獲取當前用戶ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * 處理文字雲點擊事件
   */
  handleWordcloudClick(keyword: string, legislatorName?: string): Observable<WordExplanationResponse> {
    return this.explainWord(keyword, legislatorName);
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