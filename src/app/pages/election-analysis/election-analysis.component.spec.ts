import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectionAnalysisComponent } from './election-analysis.component';

describe('ElectionAnalysisComponent', () => {
  let component: ElectionAnalysisComponent;
  let fixture: ComponentFixture<ElectionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElectionAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElectionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
