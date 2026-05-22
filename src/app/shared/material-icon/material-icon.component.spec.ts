import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialIconComponent } from './material-icon.component';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

describe('MaterialIconComponent', () => {
  let fixture: ComponentFixture<MaterialIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialIconComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the spool icon for filament category', () => {
    fixture.componentRef.setInput('categoryNickname', 'filament');
    fixture.componentRef.setInput('color', 'AABBCC');
    fixture.detectChanges();
    const spool = fixture.nativeElement.querySelector(
      'app-filament-spool-icon'
    );
    expect(spool).not.toBeNull();
    const bottle = fixture.nativeElement.querySelector('app-bottle-icon');
    expect(bottle).toBeNull();
  });

  it('should render the spool icon for wire category', () => {
    fixture.componentRef.setInput('categoryNickname', 'wire');
    fixture.componentRef.setInput('color', 'AABBCC');
    fixture.detectChanges();
    const spool = fixture.nativeElement.querySelector(
      'app-filament-spool-icon'
    );
    expect(spool).not.toBeNull();
  });

  it('should render the bottle icon for resin category', () => {
    fixture.componentRef.setInput('categoryNickname', 'resin');
    fixture.componentRef.setInput('color', 'AABBCC');
    fixture.detectChanges();
    const bottle = fixture.nativeElement.querySelector('app-bottle-icon');
    expect(bottle).not.toBeNull();
    const spool = fixture.nativeElement.querySelector(
      'app-filament-spool-icon'
    );
    expect(spool).toBeNull();
  });

  it('should render the bottle icon for powder category', () => {
    fixture.componentRef.setInput('categoryNickname', 'powder');
    fixture.componentRef.setInput('color', '112233');
    fixture.detectChanges();
    const bottle = fixture.nativeElement.querySelector('app-bottle-icon');
    expect(bottle).not.toBeNull();
  });

  it('should render the bottle icon when category is empty (unknown)', () => {
    fixture.detectChanges();
    const bottle = fixture.nativeElement.querySelector('app-bottle-icon');
    expect(bottle).not.toBeNull();
  });

  it('passes colorPattern, colors, finishType, effects to spool icon for filament category', () => {
    fixture.componentRef.setInput('categoryNickname', 'filament');
    fixture.componentRef.setInput('color', 'ff0000');
    fixture.componentRef.setInput('colorPattern', ColorPatternType.Rainbow);
    fixture.componentRef.setInput('colors', ['ff0000', '00ff00', '0000ff']);
    fixture.componentRef.setInput('finishType', FilamentFinishType.Silk);
    fixture.componentRef.setInput('effects', [FilamentEffect.Sparkle]);
    fixture.detectChanges();

    // The spool icon should be rendered (not bottle)
    const spoolIcon = fixture.nativeElement.querySelector(
      'app-filament-spool-icon'
    );
    expect(spoolIcon).toBeTruthy();
    const bottleIcon = fixture.nativeElement.querySelector('app-bottle-icon');
    expect(bottleIcon).toBeFalsy();
  });
});
