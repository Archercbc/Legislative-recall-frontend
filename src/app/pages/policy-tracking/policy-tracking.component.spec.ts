import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolicyTrackingComponent } from './policy-tracking.component';

describe('PolicyTrackingComponent', () => {
  let component: PolicyTrackingComponent;
  let fixture: ComponentFixture<PolicyTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTrackingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolicyTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
