import { Routes } from '@angular/router';
import { LegislatorsDetailComponent } from './legislators-detail/legislators-detail.component';
import { TaiwanMapComponent } from './taiwan-map/taiwan-map.component';

export const legislatorsRoutes: Routes = [
  { path: 'taiwan-map', component: TaiwanMapComponent },
  { path: 'legislator/:legislatorId', component: LegislatorsDetailComponent }
];
