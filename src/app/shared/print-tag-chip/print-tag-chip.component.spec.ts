import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintTag } from 'src/app/core/services/print-tag.service';
import { PrintTagChipComponent } from './print-tag-chip.component';

describe('PrintTagChipComponent', () => {
  let fixture: ComponentFixture<PrintTagChipComponent>;

  const tag: PrintTag = { id: 't1', name: 'Gifts', color: '#ff8800' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintTagChipComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PrintTagChipComponent);
    fixture.componentRef.setInput('tag', tag);
  });

  it('shows the name and paints the dot in the tag’s colour', () => {
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.textContent?.trim()).toBe('Gifts');
    const dot = host.querySelector<HTMLElement>('.print-tag-dot')!;
    expect(dot.style.backgroundColor).toBe('rgb(255, 136, 0)');
  });

  it('leaves the dot to the theme when the tag has no colour', () => {
    fixture.componentRef.setInput('tag', { ...tag, color: null });
    fixture.detectChanges();

    const dot = fixture.nativeElement.querySelector('.print-tag-dot');
    expect(dot.style.backgroundColor).toBe('');
  });

  it('is plain text unless clickable', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('when clickable, reports the click without triggering the row it sits in', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    const clicked = jasmine.createSpy('clicked');
    fixture.componentInstance.clicked.subscribe(clicked);
    const rowClick = jasmine.createSpy('rowClick');
    fixture.nativeElement.addEventListener('click', rowClick);

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Show prints tagged Gifts');
    button.click();

    expect(clicked).toHaveBeenCalledOnceWith(tag);
    expect(rowClick).not.toHaveBeenCalled();
  });
});
