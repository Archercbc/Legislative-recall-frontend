import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { TaiwanMapComponent } from './pages/taiwan-map/taiwan-map.component';
import { CountyDetailComponent } from './pages/county-detail/county-detail.component';
import { PoliticianDetailComponent } from './pages/politician-detail/politician-detail.component';
import { ReferendumAnalysisComponent } from './pages/referendum-analysis/referendum-analysis.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'taiwan-map', component: TaiwanMapComponent },
  { path: 'county/:countyId', component: CountyDetailComponent },
  { path: 'politician/:politicianId', component: PoliticianDetailComponent },
  { path: 'referendum-analysis', component: ReferendumAnalysisComponent },
];
