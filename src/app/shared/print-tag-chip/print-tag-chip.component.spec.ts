import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PrintTag } from 'src/app/core/services/print-tag.service';
import { PrintTagChipComponent } from './print-tag-chip.component';

describe('PrintTagChipComponent', () => {
  let fixture: ComponentFixture<PrintTagChipComponent>;

  const tag: PrintTag = { id: 't1', name: 'Gifts', color: '#ff8800' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintTagChipComponent],
      providers: [provideRouter([])],
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

  it('is plain text unless linked', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('links to the print list filtered by the tag, without triggering the row it sits in', () => {
    fixture.componentRef.setInput('linked', true);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/prints?filterByTagId=t1');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    const rowClick = jasmine.createSpy('rowClick');
    fixture.nativeElement.addEventListener('click', rowClick);
    link.dispatchEvent(click);

    expect(rowClick).not.toHaveBeenCalled();
  });
});
