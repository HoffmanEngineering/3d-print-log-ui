import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HumanizePipe } from '../../pipes/humanize.pipe';
import { CommentComponent } from './comment.component';

describe('CommentComponent', () => {
  let component: CommentComponent;
  let fixture: ComponentFixture<CommentComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [CommentComponent, HumanizePipe],
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
});
