import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoliticiansAnalysisComponent } from './politicians-analysis.component';

describe('PoliticiansAnalysisComponent', () => {
  let component: PoliticiansAnalysisComponent;
  let fixture: ComponentFixture<PoliticiansAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoliticiansAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoliticiansAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
