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
import { AiAssistantService, ChatMessage, ChatResponse, WordExplanationResponse } from '../../services/ai-assistant.service';

export interface WebChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  
  // 錯誤處理
  showError = false;
  errorMessage = '';

  constructor(private aiAssistantService: AiAssistantService) {}

  ngOnInit(): void {
    // 初始化歡迎訊息
    this.initializeWelcomeMessage();
    
    // 訂閱聊天歷史
    this.aiAssistantService.chatHistory$.subscribe(history => {
      this.messages = history.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      this.shouldScrollToBottom = true;
    });
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
   * 初始化歡迎訊息
   */
  private initializeWelcomeMessage(): void {
    const welcomeMessage: WebChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: '你好！我是立委罷免數據分析平台的AI助手，可以協助你了解網站功能和數據分析。請問有什麼我可以幫助你的嗎？',
      timestamp: new Date()
    };
    this.messages = [welcomeMessage];
  }

  /**
   * 切換展開/收縮狀態
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
    if (!this.currentMessage.trim() || this.isTyping) {
      return;
    }

    const message = this.currentMessage.trim();
    this.currentMessage = '';
    this.isTyping = true;
    this.showError = false;

    try {
      const response = await this.aiAssistantService.sendMessage(message).toPromise();
      
      if (!response?.success) {
        this.showError = true;
        this.errorMessage = response?.error || '發送訊息失敗，請稍後再試。';
      }
    } catch (error) {
      console.error('發送訊息錯誤:', error);
      this.showError = true;
      this.errorMessage = '網路連線錯誤，請稍後再試。';
    } finally {
      this.isTyping = false;
    }
  }

  /**
   * 處理鍵盤事件
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * 滾動到底部
   */
  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * 聚焦輸入框
   */
  private focusInput(): void {
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2);
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
   * 追蹤訊息ID
   */
  trackByMessageId(_index: number, message: WebChatMessage): string {
    return message.id;
  }

  /**
   * 清空聊天歷史
   */
  clearChatHistory(): void {
    this.aiAssistantService.clearChatHistory();
    this.initializeWelcomeMessage();
  }

  /**
   * 發送快速問題
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
      next: (response: WordExplanationResponse) => {
        if (response.success && response.explanation) {
          // 添加詞彙解釋到聊天歷史
          const explanationMessage: WebChatMessage = {
            id: this.generateId(),
            type: 'assistant',
            content: `關於「${keyword}」的解釋：\n\n${response.explanation}`,
            timestamp: new Date()
          };
          this.messages.push(explanationMessage);
          this.shouldScrollToBottom = true;
        } else {
          this.showError = true;
          this.errorMessage = response.error || '無法解釋詞彙，請稍後再試。';
        }
      },
      error: (error) => {
        console.error('詞彙解釋錯誤:', error);
        this.showError = true;
        this.errorMessage = '網路連線錯誤，請稍後再試。';
      }
    });
  }

  /**
   * 關閉錯誤提示
   */
  closeError(): void {
    this.showError = false;
    this.errorMessage = '';
  }
}
