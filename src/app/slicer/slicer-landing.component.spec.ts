import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SlicerLandingComponent } from './slicer-landing.component';
import { MetaTagService } from '../core/services/meta-tag.service';

describe('SlicerLandingComponent', () => {
  it('renders the H1 and steps for the route config and sets SEO tags', async () => {
    const meta = jasmine.createSpyObj<MetaTagService>('MetaTagService', [
      'setSeoTags',
    ]);
    await TestBed.configureTestingModule({
      imports: [
        SlicerLandingComponent,
        RouterModule.forRoot([]),
        NoopAnimationsModule,
      ],
      providers: [
        { provide: MetaTagService, useValue: meta },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { slicerKey: 'orcaslicer' } } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SlicerLandingComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Log 3D Prints from OrcaSlicer');
    expect(text).toContain('post-processing script');
    expect(meta.setSeoTags).toHaveBeenCalledWith(
      jasmine.objectContaining({ title: jasmine.stringMatching(/OrcaSlicer/) })
    );
  });
});
