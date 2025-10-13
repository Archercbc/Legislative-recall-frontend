import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { TaiwanMapComponent } from './pages/legislators/taiwan-map/taiwan-map.component';
import { PoliticiansAnalysisComponent } from './pages/politicians/politicians-analysis/politicians-analysis.component';
import { PolicyTrackingComponent } from './pages/policy/policy-tracking/policy-tracking.component';
import { ElectionAnalysisComponent } from './pages/election-analysis/election-analysis.component';
import { LegislatorsDetailComponent } from './pages/legislators/legislators-detail/legislators-detail.component';
import {PoliticiansComponent} from './pages/politicians/politician/politicians.component';
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'taiwan-map', component: TaiwanMapComponent },
  { path: 'politicians', component: PoliticiansComponent },
  { path: 'politicians-analysis/:politicianName', component: PoliticiansAnalysisComponent },
  { path: 'politician/:politicianName', component: PoliticiansAnalysisComponent },
  { path: 'legislator/:legislatorId', component: LegislatorsDetailComponent },
  { path: 'policy-tracking', component: PolicyTrackingComponent },
  { path: 'election-analysis', component: ElectionAnalysisComponent }
];
