import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { TaiwanMapComponent } from './pages/legislators/taiwan-map/taiwan-map.component';
import { PoliticiansAnalysisComponent } from './pages/politicians/politicians-analysis/politicians-analysis.component';
import { PolicyTrackingComponent } from './pages/policy/policy-tracking/policy-tracking.component';
import { PolicyListComponent } from './pages/policy/policy-list/policy-list.component';
import { ElectionAnalysisComponent } from './pages/election-analysis/election-detail/election-analysis.component';
import { ElectionListComponent } from './pages/election-analysis/election-list/election-list.component';
import { LegislatorsDetailComponent } from './pages/legislators/legislators-detail/legislators-detail.component';
import {PoliticiansComponent} from './pages/politicians/politician/politicians.component';
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'taiwan-map', component: TaiwanMapComponent },
  { path: 'politicians', component: PoliticiansComponent },
  { path: 'politicians-analysis/:politicianName', component: PoliticiansAnalysisComponent },
  { path: 'legislator/:legislatorId', component: LegislatorsDetailComponent },
  { path: 'policy', component: PolicyListComponent },
  { path: 'policy-tracking/:policyId', component: PolicyTrackingComponent },
  { path: 'election-analysis', component: ElectionListComponent },
  { path: 'election-analysis/:id', component: ElectionAnalysisComponent }
];
