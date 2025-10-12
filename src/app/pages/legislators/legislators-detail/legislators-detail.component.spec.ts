import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegislatorsDetailComponent } from './legislators-detail.component';

describe('LegislatorsDetailComponent', () => {
  let component: LegislatorsDetailComponent;
  let fixture: ComponentFixture<LegislatorsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegislatorsDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LegislatorsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
