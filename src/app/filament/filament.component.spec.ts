import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilamentComponent } from './filament.component';

describe('FilamentComponent', () => {
  let component: FilamentComponent;
  let fixture: ComponentFixture<FilamentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
