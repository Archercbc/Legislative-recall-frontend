import {

  Component,

  OnDestroy,

  OnInit,

  AfterViewInit,

  ElementRef,

} from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import type { Container, ISourceOptions } from '@tsparticles/engine';

import { tsParticles } from '@tsparticles/engine';

import { loadSlim } from '@tsparticles/slim';

import VanillaTilt from 'vanilla-tilt';

import { VisitorService, VisitorStats } from '../../services/visitor.service';



/** 粒子連線選項（以寬鬆物件載入） */

const HERO_NETWORK_OPTIONS = {

  detectRetina: true,

  fullScreen: { enable: false },

  fpsLimit: 60,

  background: { opacity: 0 },

  interactivity: {

    detectsOn: 'window',

    events: {

      onHover: { enable: true, mode: 'grab' },

      resize: { enable: true },

    },

    modes: {

      grab: {

        distance: 220,

        links: { opacity: 0.75 },

      },

    },

  },

  particles: {

    number: { value: 48 },

    // 星座連線保留；色相改為 D+ 青綠／珊瑚（不再用藍紫）
    color: { value: ['#5eead4', '#99f6e4', '#fda4a4'] },

    shape: { type: 'circle' },

    opacity: { value: { min: 0.22, max: 0.55 } },

    size: { value: { min: 1.1, max: 3.2 } },

    links: {

      enable: true,

      distance: 128,

      color: '#14b8a6',

      opacity: 0.38,

      width: 0.85,

      triangles: { enable: false },

    },

    move: {

      enable: true,

      speed: { min: 0.08, max: 0.45 },

      random: true,

      outModes: { default: 'bounce' },

    },

  },

};



@Component({

  selector: 'app-home',

  standalone: true,

  imports: [CommonModule, RouterModule],

  templateUrl: './home.component.html',

  styleUrl: './home.component.scss',

})

export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  visitorStats: VisitorStats | null = null;



  /** 捲動觸發後由 0 累加到目標 */

  displayedTotalVisits = 0;

  displayedTodayVisitors = 0;

  displayedLegislators = 0;

  displayedHours = 0;



  private revealObserver?: IntersectionObserver;

  private statsObserver?: IntersectionObserver;

  private statsAnimated = false;

  private particlesContainer?: Container;

  private readonly tiltElements: HTMLElement[] = [];



  constructor(

    private host: ElementRef<HTMLElement>,

    private visitorService: VisitorService,

  ) {}



  ngOnInit(): void {

    this.loadVisitorStats();

    setInterval(() => this.loadVisitorStats(), 30000);

  }



  ngAfterViewInit(): void {

    const rootEl = this.host.nativeElement;



    this.revealObserver = new IntersectionObserver(

      (entries) => {

        for (const e of entries) {

          if (!e.isIntersecting) continue;

          e.target.classList.add('is-revealed');

        }

      },

      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },

    );



    rootEl.querySelectorAll('.scroll-reveal').forEach((el) => {

      this.revealObserver?.observe(el);

    });



    const statsSection = rootEl.querySelector('.stats-section');

    if (statsSection) {

      this.statsObserver = new IntersectionObserver(

        (entries) => {

          for (const entry of entries) {

            if (!entry.isIntersecting || this.statsAnimated) continue;

            this.statsAnimated = true;

            this.runStatAnimations();

            this.statsObserver?.disconnect();

          }

        },

        { threshold: 0.25 },

      );

      this.statsObserver.observe(statsSection);

    }



    void this.bootstrapMotion(rootEl);

  }



  ngOnDestroy(): void {

    this.revealObserver?.disconnect();

    this.statsObserver?.disconnect();



    this.tiltElements.forEach((el) => {

      (el as HTMLElement & { vanillaTilt?: { destroy(): void } }).vanillaTilt?.destroy();

    });

    this.tiltElements.length = 0;



    try {

      this.particlesContainer?.destroy();

    } catch {

      /* no-op */

    }

    this.particlesContainer = undefined;

  }



  private loadVisitorStats(): void {

    this.visitorService

      .getVisitorStats()

      .then((stats) => {

        this.visitorStats = stats;

        if (this.statsAnimated && stats) {

          this.displayedTotalVisits = stats.total_visits;

          this.displayedTodayVisitors = stats.today_visitors;

        }

      })

      .catch((error) => {

        console.error('獲取訪問統計失敗:', error);

        this.visitorStats = { total_visits: 0, today_visitors: 0 };

      });

  }



  getLegislatorCount(): number {

    return 31;

  }



  private bootstrapMotion(root: HTMLElement): void {

    void this.initParticles(root);

    queueMicrotask(() => this.initVanillaTilt(root));

  }



  private async initParticles(root: HTMLElement): Promise<void> {

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

      return;

    }

    const el = root.querySelector<HTMLElement>('.hero-particles');

    if (!el) return;



    const mobile =

      typeof window.matchMedia !== 'undefined' &&

      window.matchMedia('(max-width: 640px)').matches;



    try {

      await loadSlim(tsParticles);

      const opts = {

        ...HERO_NETWORK_OPTIONS,

        particles: {

          ...HERO_NETWORK_OPTIONS.particles,

          number: {

            ...HERO_NETWORK_OPTIONS.particles.number,

            value: mobile ? 28 : 52,

          },

        },

      };



      this.particlesContainer =

        (await tsParticles.load({

          element: el,

          id: 'poi-home-hero-net',

          options: opts as unknown as ISourceOptions,

        })) ?? undefined;

    } catch {

      console.warn('[POI Home] tsParticles 初始化失敗，僅保留背景網格與波浪線');

    }

  }



  private initVanillaTilt(root: HTMLElement): void {

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

      return;

    }

    if (

      typeof window.matchMedia !== 'undefined' &&

      window.matchMedia('(pointer: coarse)').matches

    ) {

      return;

    }

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.js-tilt'));

    if (!nodes.length) return;



    VanillaTilt.init(nodes, {

      max: 12,

      speed: 400,

      scale: 1.02,

      glare: true,

      'max-glare': 0.28,

      gyroscope: false,

      perspective: 1100,

    });

    this.tiltElements.push(...nodes);

  }



  private runStatAnimations(): void {

    const duration = 1650;

    const start = performance.now();



    const targetTotal =

      typeof this.visitorStats?.total_visits === 'number'

        ? this.visitorStats.total_visits

        : 0;

    const targetToday =

      typeof this.visitorStats?.today_visitors === 'number'

        ? this.visitorStats.today_visitors

        : 0;

    const targetLegislators = this.getLegislatorCount();

    const targetHours = 24;



    const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;



    const tick = (now: number) => {

      const t = Math.min(1, (now - start) / duration);

      const k = easeOutQuart(t);



      this.displayedTotalVisits = Math.round(targetTotal * k);

      this.displayedTodayVisitors = Math.round(targetToday * k);

      this.displayedLegislators = Math.round(targetLegislators * k);

      this.displayedHours = Math.round(targetHours * k);



      if (t < 1) requestAnimationFrame(tick);

      else {

        this.displayedTotalVisits = targetTotal;

        this.displayedTodayVisitors = targetToday;

        this.displayedLegislators = targetLegislators;

        this.displayedHours = targetHours;

      }

    };



    requestAnimationFrame(tick);

  }

}

