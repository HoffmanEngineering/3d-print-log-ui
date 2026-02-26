import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialIconComponent } from './material-icon.component';

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
});
