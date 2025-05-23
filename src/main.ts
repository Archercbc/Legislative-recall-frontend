import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes'; // 你的路由定義
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),  // ✅ 這行才是正確注入 HttpClient 的方式
    provideRouter(routes) // ✅ 若你使用 Router，必須提供它
  ]
});