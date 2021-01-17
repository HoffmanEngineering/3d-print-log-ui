import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilamentListComponent } from './filament-list.component';

xdescribe('FilamentListComponent', () => {
  let component: FilamentListComponent;
  let fixture: ComponentFixture<FilamentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentListComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
