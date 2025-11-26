import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DefaultLayoutComponent } from './layout/default-layout/default-layout.component';
//import { WebAiAssistantComponent } from './pages/web-ai-assistant/web-ai-assistant.component';
import { VisitorService } from './services/visitor.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, DefaultLayoutComponent],//, WebAiAssistantComponent
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor(private visitorService: VisitorService) { }

  ngOnInit(): void {
    // 在應用啟動時記錄訪問
    this.visitorService.recordPageVisit('/');
  }
}
