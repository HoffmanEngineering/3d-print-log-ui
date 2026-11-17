import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ProjectImageComponent } from './project-image.component';
import { ProjectService } from 'src/app/core/services/project.service';

describe('ProjectImageComponent', () => {
  let fixture: ComponentFixture<ProjectImageComponent>;
  let mockProjectService: MockedObject<ProjectService>;

  beforeEach(async () => {
    mockProjectService = {
      getProjectImage: vi.fn().mockName('ProjectService.getProjectImage'),
    } as unknown as MockedObject<ProjectService>;

    await TestBed.configureTestingModule({
      imports: [ProjectImageComponent, NoopAnimationsModule],
      providers: [{ provide: ProjectService, useValue: mockProjectService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectImageComponent);
  });

  it('shows folder icon when imageId is undefined', async () => {
    fixture.componentRef.setInput('projectId', 'abc');
    fixture.componentRef.setInput('imageId', undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon.textContent.trim()).toBe('folder');
    expect(mockProjectService.getProjectImage).not.toHaveBeenCalled();
  });

  it('shows folder icon when imageId is 0', async () => {
    fixture.componentRef.setInput('projectId', 'abc');
    fixture.componentRef.setInput('imageId', 0);
    fixture.detectChanges();
    await fixture.whenStable();

    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon.textContent.trim()).toBe('folder');
    expect(mockProjectService.getProjectImage).not.toHaveBeenCalled();
  });

  it('shows img when image data loads successfully', async () => {
    mockProjectService.getProjectImage.mockReturnValue(
      of('data:image/png;base64,abc123')
    );
    fixture.componentRef.setInput('projectId', 'abc');
    fixture.componentRef.setInput('imageId', 7);
    fixture.detectChanges();
    await fixture.whenStable();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('data:image/png;base64,abc123');
    expect(mockProjectService.getProjectImage).toHaveBeenCalledWith('abc', 7);
  });

  it('asks for the thumbnail when one is bound', async () => {
    mockProjectService.getProjectImage.mockReturnValue(
      of('data:image/webp;base64,abc123')
    );
    fixture.componentRef.setInput('projectId', 'abc');
    fixture.componentRef.setInput('imageId', 7);
    fixture.componentRef.setInput(
      'thumbnailUrl',
      '/api/Projects/abc/images/7/thumbnail'
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockProjectService.getProjectImage).toHaveBeenCalledWith(
      'abc',
      7,
      '/api/Projects/abc/images/7/thumbnail'
    );
  });

  it('shows folder icon when image fetch returns empty string', async () => {
    mockProjectService.getProjectImage.mockReturnValue(of(''));
    fixture.componentRef.setInput('projectId', 'abc');
    fixture.componentRef.setInput('imageId', 7);
    fixture.detectChanges();
    await fixture.whenStable();

    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon.textContent.trim()).toBe('folder');
  });
});
