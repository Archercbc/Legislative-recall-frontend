import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CivicIssuesComponent } from './civic-issues.component';

describe('CivicIssuesComponent', () => {
  let component: CivicIssuesComponent;
  let fixture: ComponentFixture<CivicIssuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CivicIssuesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CivicIssuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
