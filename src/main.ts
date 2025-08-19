import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
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
    ...appConfig.providers, // 使用 app.config.ts 中的配置
    provideHttpClient(),  // 提供 HttpClient
    provideAnimations(), // 添加動畫提供者
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