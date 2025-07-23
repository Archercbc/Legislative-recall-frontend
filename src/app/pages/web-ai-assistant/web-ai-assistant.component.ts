import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CardModule,
  ButtonModule,
  BadgeModule,
  FormModule,
  ModalModule,
  AlertModule
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { AiAssistantService, ChatMessage, ChatResponse, UserStats } from '../../services/ai-assistant.service';

export interface WebChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'guide' | 'progress' | 'plan' | 'general' | 'wordcloud' | 'emotion' | 'volume' | 'trend' | 'platform' | 'politician';
}

@Component({
  selector: 'app-web-ai-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    BadgeModule,
    FormModule,
    ModalModule,
    AlertModule,
    IconDirective,
    MarkdownPipe
  ],
  templateUrl: './web-ai-assistant.component.html',
  styleUrls: ['./web-ai-assistant.component.scss']
})
export class WebAiAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // 組件狀態
  isExpanded = false;
  isTyping = false;
  shouldScrollToBottom = false;
  currentMessage = '';
  
  // 聊天數據
  messages: WebChatMessage[] = [];
  
  // 用戶信息
  userStats: UserStats | null = null;
  usageInfo: any = null;
  showUpgradeModal = false;
  showLimitAlert = false;
  limitMessage = '';

  constructor(private aiAssistantService: AiAssistantService) {}

  ngOnInit(): void {
    // 初始化歡迎訊息
    this.initializeWelcomeMessage();
    
    // 訂閱用戶統計
    this.aiAssistantService.userStats$.subscribe(stats => {
      this.userStats = stats;
    });
    
    // 訂閱使用信息
    this.aiAssistantService.usageInfo$.subscribe(info => {
      this.usageInfo = info;
    });
    
    // 獲取初始數據
    this.loadUserData();
  }

  ngOnDestroy(): void {
    // 清理資源
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * 加載用戶數據
   */
  private loadUserData(): void {
    this.aiAssistantService.getUserStats().subscribe(stats => {
      if (stats) {
        this.userStats = stats;
      }
    });
  }

  /**
   * 初始化歡迎訊息
   */
  private initializeWelcomeMessage(): void {
    if (this.messages.length === 0) {
      this.addMessage('assistant', '您好！我是您的網站助手。我可以幫助您了解立委數據分析、文字雲、情緒分析等功能。請告訴我您想了解什麼？', 'guide');
    }
  }

  /**
   * 切換展開狀態
   */
  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded) {
      setTimeout(() => {
        this.focusInput();
        this.scrollToBottom();
      }, 100);
    }
  }

  /**
   * 發送訊息
   */
  async sendMessage(): Promise<void> {
    const message = this.currentMessage.trim();
    if (!message || this.isTyping) {
      return;
    }

    // 添加用戶訊息
    this.addMessage('user', message);
    this.currentMessage = '';
    this.isTyping = true;

    try {
      // 發送到AI服務
      this.aiAssistantService.sendMessage(message).subscribe({
        next: (response: ChatResponse) => {
          this.isTyping = false;
          
          if (response.success) {
            // 添加AI回應
            this.addMessage('assistant', response.content || '', response.category as any);
            
            // 檢查是否需要升級
            if (this.aiAssistantService.needsUpgrade()) {
              this.showUpgradeModal = true;
            }
          } else {
            // 處理錯誤
            if (response.error) {
              this.addMessage('assistant', `❌ ${response.error}`, 'general');
              
              // 顯示限制警告
              if (response.limit_info) {
                this.showLimitAlert = true;
                this.limitMessage = response.error;
              }
              
              // 顯示建議
              if (response.suggestions && response.suggestions.length > 0) {
                const suggestions = response.suggestions.join('\n• ');
                this.addMessage('assistant', `💡 **建議問題：**\n• ${suggestions}`, 'guide');
              }
            }
          }
        },
        error: (error) => {
          this.isTyping = false;
          console.error('發送訊息失敗:', error);
          this.addMessage('assistant', '❌ 網路連線錯誤，請稍後再試。', 'general');
        }
      });
    } catch (error) {
      this.isTyping = false;
      console.error('發送訊息異常:', error);
      this.addMessage('assistant', '❌ 發生未知錯誤，請稍後再試。', 'general');
    }
  }

  /**
   * 處理 Enter 鍵
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * 添加訊息
   */
  private addMessage(type: 'user' | 'assistant', content: string, category: string = 'general'): void {
    const message: WebChatMessage = {
      id: this.generateId(),
      type,
      content,
      timestamp: new Date(),
      category: category as any
    };
    
    this.messages.push(message);
    this.shouldScrollToBottom = true;
  }

  /**
   * 滾動到底部
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.warn('無法滾動到底部:', err);
    }
  }

  /**
   * 聚焦輸入框
   */
  private focusInput(): void {
    try {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    } catch (err) {
      console.warn('無法聚焦輸入框:', err);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * 格式化時間
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * 獲取類別圖標
   */
  getCategoryIcon(category?: string): string {
    switch (category) {
      case 'guide': return 'cilMap';
      case 'wordcloud': return 'cilCloud';
      case 'emotion': return 'cilHeart';
      case 'volume': return 'cilVolumeHigh';
      case 'trend': return 'cilChart';
      case 'platform': return 'cilGlobe';
      case 'politician': return 'cilUser';
      case 'progress': return 'cilChart';
      case 'plan': return 'cilCalendar';
      default: return 'cilSpeech';
    }
  }

  /**
   * TrackBy 函數
   */
  trackByMessageId(_index: number, message: WebChatMessage): string {
    return message.id;
  }

  /**
   * 獲取剩餘聊天次數
   */
  getRemainingChats(): { daily: number; monthly: number } {
    return this.aiAssistantService.getRemainingChats();
  }

  /**
   * 獲取訂閱等級
   */
  getSubscriptionLevel(): string {
    return this.aiAssistantService.getSubscriptionLevel();
  }

  /**
   * 格式化訂閱等級顯示
   */
  formatSubscriptionLevel(level: string): string {
    return this.aiAssistantService.formatSubscriptionLevel(level);
  }

  /**
   * 檢查是否為免費用戶
   */
  isFreeUser(): boolean {
    return this.aiAssistantService.isFreeUser();
  }

  /**
   * 檢查是否需要升級
   */
  needsUpgrade(): boolean {
    return this.aiAssistantService.needsUpgrade();
  }

  /**
   * 關閉升級模態框
   */
  closeUpgradeModal(): void {
    this.showUpgradeModal = false;
  }

  /**
   * 關閉限制警告
   */
  closeLimitAlert(): void {
    this.showLimitAlert = false;
  }

  /**
   * 升級訂閱
   */
  upgradeSubscription(level: 'premium' | 'pro'): void {
    this.aiAssistantService.upgradeSubscription(level).subscribe({
      next: (success) => {
        if (success) {
          this.showUpgradeModal = false;
          this.addMessage('assistant', `✅ 已成功升級到${this.formatSubscriptionLevel(level)}！`, 'general');
        }
      },
      error: (error) => {
        console.error('升級失敗:', error);
        this.addMessage('assistant', '❌ 升級失敗，請稍後再試。', 'general');
      }
    });
  }

  /**
   * 重置會話
   */
  resetSession(): void {
    this.aiAssistantService.resetSession();
    this.messages = [];
    this.initializeWelcomeMessage();
  }

  /**
   * 快速問題模板
   */
  sendQuickQuestion(question: string): void {
    this.currentMessage = question;
    this.sendMessage();
  }

  /**
   * 處理文字雲點擊
   */
  handleWordcloudClick(keyword: string, legislatorName?: string): void {
    this.aiAssistantService.handleWordcloudClick(keyword, legislatorName).subscribe({
      next: (response) => {
        if (response.success && response.content) {
          this.addMessage('assistant', response.content, 'wordcloud');
        }
      },
      error: (error) => {
        console.error('文字雲查詢失敗:', error);
        this.addMessage('assistant', '❌ 查詢失敗，請稍後再試。', 'wordcloud');
      }
    });
  }
}
