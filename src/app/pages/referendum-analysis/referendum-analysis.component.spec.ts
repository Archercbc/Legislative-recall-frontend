import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferendumAnalysisComponent } from './referendum-analysis.component';

describe('ReferendumAnalysisComponent', () => {
  let component: ReferendumAnalysisComponent;
  let fixture: ComponentFixture<ReferendumAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferendumAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferendumAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
