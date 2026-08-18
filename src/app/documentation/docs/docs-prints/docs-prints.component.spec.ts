import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocsPrintsComponent } from './docs-prints.component';

describe('DocsPrintsComponent', () => {
  let component: DocsPrintsComponent;
  let fixture: ComponentFixture<DocsPrintsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DocsPrintsComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsPrintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // "The component can be created" would still pass with the whole bulk actions
  // section deleted, so this asserts on the copy itself.
  it('documents the bulk actions', () => {
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Add to project');
    expect(text).toContain('Prints already in another project will be moved');
    expect(text).toContain('Remove from project');
    expect(text).toContain('Visibility');
    expect(text).toContain('Printer');
    expect(text).toContain('Permissions');
  });
});
