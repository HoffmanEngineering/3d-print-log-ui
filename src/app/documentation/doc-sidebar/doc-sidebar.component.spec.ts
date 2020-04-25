import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DocSidebarComponent } from './doc-sidebar.component';

describe('DocSidebarComponent', () => {
  let component: DocSidebarComponent;
  let fixture: ComponentFixture<DocSidebarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DocSidebarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
