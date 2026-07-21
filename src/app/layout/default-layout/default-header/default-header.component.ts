import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { navItems, navigationConfig } from '../_nav';

@Component({
  selector: 'app-default-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './default-header.component.html',
  styleUrl: './default-header.component.scss'
})
export class DefaultHeaderComponent implements OnInit, OnDestroy {
  navItems = navItems;
  brand = navigationConfig.brand;

  /** 首頁用暗色戲作 Header；分析頁用淺色實心 */
  isHomeRoute = false;
  isSolid = true;

  private routeSub?: Subscription;

  constructor(private router: Router) {
    this.syncRoute(this.router.url);
  }

  ngOnInit(): void {
    this.routeSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncRoute(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private syncRoute(url: string): void {
    const path = url.split('?')[0];
    this.isHomeRoute = path === '/' || path === '';
    // 首頁全程暗色，避免捲動後白 Header 壓在暗底上造成斷層
    this.isSolid = !this.isHomeRoute;
  }
}
