import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoliticianDetailComponent } from './politician-detail.component';

describe('PoliticianDetailComponent', () => {
  let component: PoliticianDetailComponent;
  let fixture: ComponentFixture<PoliticianDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoliticianDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoliticianDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
