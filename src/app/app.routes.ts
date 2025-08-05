import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { TaiwanMapComponent } from './pages/taiwan-map/taiwan-map.component';
import { ReferendumAnalysisComponent } from './pages/referendum-analysis/referendum-analysis.component';
import { ContactComponent } from './pages/contact/contact.component';
import { PoliticiansAnalysisComponent } from './pages/politicians-analysis/politicians-analysis.component';
import { CivicIssuesComponent } from './pages/civic-issues/civic-issues.component';
import { PolicyTrackingComponent } from './pages/policy-tracking/policy-tracking.component';
import { ElectionAnalysisComponent } from './pages/election-analysis/election-analysis.component';
import { PoliticianDetailComponent } from './pages/politician-detail/politician-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'taiwan-map', component: TaiwanMapComponent },
  { path: 'referendum-analysis', component: ReferendumAnalysisComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'politicians', component: PoliticiansAnalysisComponent },
  { path: 'politician/:politicianId', component: PoliticianDetailComponent },
  { path: 'civic-issues', component: CivicIssuesComponent },
  { path: 'policy-tracking', component: PolicyTrackingComponent },
  { path: 'election-analysis', component: ElectionAnalysisComponent }
];
