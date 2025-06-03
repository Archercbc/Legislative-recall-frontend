import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { IconModule } from '@coreui/icons-angular'; // <-- 這裡只導入 IconModule

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IconModule
  ],
  providers: [], // 如果你不需要提供其他服務，這裡可以留空
  bootstrap: [AppComponent]
})
export class AppModule {}