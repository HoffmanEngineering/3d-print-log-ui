import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilamentDetailComponent } from './filament-detail.component';

describe('FilamentDetailComponent', () => {
  let component: FilamentDetailComponent;
  let fixture: ComponentFixture<FilamentDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentDetailComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
