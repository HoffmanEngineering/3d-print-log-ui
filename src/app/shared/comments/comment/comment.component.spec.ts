import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { MatMenuModule } from '@angular/material/menu';
import { By } from '@angular/platform-browser';

import { HumanizePipe } from '../../pipes/humanize.pipe';
import { CommentComponent } from './comment.component';

describe('CommentComponent', () => {
  let component: CommentComponent;
  let fixture: ComponentFixture<CommentComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [CommentComponent, HumanizePipe],
        imports: [MatMenuModule],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentComponent);
    component = fixture.componentInstance;
    component.comment = {
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the More menu when showDelete property is true', fakeAsync(() => {
    // Arrange
    component.showDelete = true;

    // Act
    fixture.detectChanges();

    // Assert
    const buttonSelector = `#comment${component.comment.id}MoreButton`;
    const btn = fixture.debugElement.query(By.css(buttonSelector));

    expect(btn).not.toBeNull();
  }));

  it('should not show the More menu when showDelete property is false', fakeAsync(() => {
    // Arrange
    component.showDelete = false;

    // Act
    fixture.detectChanges();

    // Assert
    const buttonSelector = `#comment${component.comment.id}MoreButton`;
    const btn = fixture.debugElement.query(By.css(buttonSelector));

    expect(btn).toBeNull();
  }));
});
