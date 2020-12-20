import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParserUnavailableDialogComponent } from './parser-unavailable-dialog.component';

describe('ParserUnavailableDialogComponent', () => {
  let component: ParserUnavailableDialogComponent;
  let fixture: ComponentFixture<ParserUnavailableDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ParserUnavailableDialogComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParserUnavailableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
