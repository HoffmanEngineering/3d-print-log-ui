import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AdComponent } from './ad.component';

describe('AdComponent', () => {
  let component: AdComponent;
  let fixture: ComponentFixture<AdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default adSlot to null', () => {
    expect(component.adSlot()).toBeNull();
  });

  it('should default fullWidthResponsive to true', () => {
    expect(component.fullWidthResponsive()).toBeTrue();
  });

  it('should pass adSlot to ng-adsense', () => {
    fixture.componentRef.setInput('adSlot', 123456789);
    fixture.detectChanges();
    const adsense = fixture.nativeElement.querySelector('ng-adsense');
    expect(adsense).toBeTruthy();
    expect(component.adSlot()).toBe(123456789);
  });

  it('should pass fullWidthResponsive=false when set', () => {
    fixture.componentRef.setInput('fullWidthResponsive', false);
    fixture.detectChanges();
    expect(component.fullWidthResponsive()).toBeFalse();
  });

  it('should render an aside with aria-label Advertisement', () => {
    const aside = fixture.nativeElement.querySelector(
      'aside[aria-label="Advertisement"]'
    );
    expect(aside).toBeTruthy();
  });
});
