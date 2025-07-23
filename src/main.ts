import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes'; // 你的路由定義
import { provideAnimations } from '@angular/platform-browser/animations';

// 註冊 CoreUI 4.0 圖標
import { IconSetService } from '@coreui/icons-angular';
import {
  cilList, cilClock, cilXCircle, cilWarning, cilBan, cilCheckCircle,
  cilChartLine, cilCheck, cilFilter, cilMap, cilPeople
} from '@coreui/icons';

// 提供 IconSetService
import { importProvidersFrom } from '@angular/core';
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),  // ✅ 這行才是正確注入 HttpClient 的方式
    provideRouter(routes), // ✅ 若你使用 Router，必須提供它
    provideAnimations(), // ✅ 添加動畫提供者
    // 註冊 CoreUI 圖標
    IconSetService,
    {
      provide: 'icons',
      useValue: {
        cilList, cilClock, cilXCircle, cilWarning, cilBan, cilCheckCircle,
        cilChartLine, cilCheck, cilFilter, cilMap, cilPeople
      }
    }
  ]
}).then(() => {
  // 設置圖標
  const iconSetService = new IconSetService();
  iconSetService.icons = {
    cilList, cilClock, cilXCircle, cilWarning, cilBan, cilCheckCircle,
    cilChartLine, cilCheck, cilFilter, cilMap, cilPeople
  };
});