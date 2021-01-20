import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilamentListContainerComponent } from './filament-list-container.component';

describe('FilamentListContainerComponent', () => {
  let component: FilamentListContainerComponent;
  let fixture: ComponentFixture<FilamentListContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentListContainerComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentListContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
