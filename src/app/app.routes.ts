import { Routes } from '@angular/router';
import { TaiwanMapComponent } from './pages/taiwan-map/taiwan-map.component';
import { CountyDetailComponent } from './pages/county-detail/county-detail.component';
import { PoliticianDetailComponent } from './pages/politician-detail/politician-detail.component';

export const routes: Routes = [
  { path: '', component: TaiwanMapComponent },
  { path: 'county/:countyId', component: CountyDetailComponent },
  { path: 'politician/:politicianId', component: PoliticianDetailComponent },
];
