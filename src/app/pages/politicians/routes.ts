import { Routes } from '@angular/router';
import { PoliticiansComponent } from './politician/politicians.component';
import { PoliticiansAnalysisComponent } from './politicians-analysis/politicians-analysis.component';

export const politiciansRoutes: Routes = [
  { path: '', component: PoliticiansComponent },
  { path: 'analysis/:politicianName', component: PoliticiansAnalysisComponent }
];
