import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatMenuModule } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { HumanizePipe } from '../../pipes/humanize.pipe';
import { CommentComponent } from './comment.component';

const MOCK_COMMENT = {
  id: 123,
  body: 'Test Comment',
  createdBy: {
    profilePicture: '',
    id: 1,
    coverPicture: '',
    displayName: 'User',
  },
  createdById: 1,
  createdDate: new Date('2020-09-09 00:00:00'),
  updatedBy: {
    profilePicture: '',
    id: 1,
    coverPicture: '',
    displayName: 'User',
  },
  updatedById: 1,
  updatedDate: new Date('2020-09-09 00:00:00'),
};

describe('CommentComponent', () => {
  let component: CommentComponent;
  let fixture: ComponentFixture<CommentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CommentComponent, HumanizePipe],
      imports: [MatMenuModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  it('should create', () => {
    fixture = TestBed.createComponent(CommentComponent);
    component = fixture.componentInstance;
    component.comment = MOCK_COMMENT;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show the More menu when showDelete property is true', () => {
    // Arrange - set showDelete before initial detectChanges so the @if
    // branch is stable from the start (avoids NG0100 in Angular v21)
    fixture = TestBed.createComponent(CommentComponent);
    component = fixture.componentInstance;
    component.comment = MOCK_COMMENT;
    component.showDelete = true;

    // Act
    fixture.detectChanges();

    // Assert
    const buttonSelector = `#comment${component.comment.id}MoreButton`;
    const btn = fixture.debugElement.query(By.css(buttonSelector));

    expect(btn).not.toBeNull();
  });

  it('should not show the More menu when showDelete property is false', () => {
    // Arrange
    fixture = TestBed.createComponent(CommentComponent);
    component = fixture.componentInstance;
    component.comment = MOCK_COMMENT;
    component.showDelete = false;

    // Act
    fixture.detectChanges();

    // Assert
    const buttonSelector = `#comment${component.comment.id}MoreButton`;
    const btn = fixture.debugElement.query(By.css(buttonSelector));

    expect(btn).toBeNull();
  });
});
