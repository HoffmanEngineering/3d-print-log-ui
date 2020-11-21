import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocsCuraPluginComponent } from './docs-cura-plugin.component';

describe('DocsCuraPluginComponent', () => {
  let component: DocsCuraPluginComponent;
  let fixture: ComponentFixture<DocsCuraPluginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocsCuraPluginComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsCuraPluginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
