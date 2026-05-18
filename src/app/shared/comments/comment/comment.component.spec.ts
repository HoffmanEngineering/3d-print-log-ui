import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { HumanizePipe } from '../../pipes/humanize.pipe';
import { CommentComponent } from './comment.component';
import { MatMenuModule } from '@angular/material/menu';

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

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommentComponent, HumanizePipe],
      imports: [MatMenuModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('comment', MOCK_COMMENT);
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the More menu when showDelete property is true', () => {
    fixture.componentRef.setInput('showDelete', true);
    fixture.detectChanges();

    const btn = fixture.debugElement.query(
      By.css(`#comment${component.comment().id}MoreButton`)
    );
    expect(btn).not.toBeNull();
  });

  it('should not show the More menu when showDelete property is false', () => {
    fixture.componentRef.setInput('showDelete', false);
    fixture.detectChanges();

    const btn = fixture.debugElement.query(
      By.css(`#comment${component.comment().id}MoreButton`)
    );
    expect(btn).toBeNull();
  });
});
