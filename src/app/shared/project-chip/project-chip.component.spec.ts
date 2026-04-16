import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ProjectChipComponent } from './project-chip.component';
import { ProjectStatus } from 'src/app/core/services/project.service';

describe('ProjectChipComponent', () => {
  let fixture: ComponentFixture<ProjectChipComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ProjectChipComponent],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectChipComponent);
  });

  it('should display the project name', () => {
    fixture.componentRef.setInput('projectName', 'My Voron Build');
    fixture.componentRef.setInput('projectStatus', ProjectStatus.InProgress);
    fixture.detectChanges();
    const chip = fixture.debugElement.query(By.css('.project-chip'));
    expect(chip.nativeElement.textContent).toContain('My Voron Build');
  });

  it('should emit chipClicked when no projectId is set', () => {
    fixture.componentRef.setInput('projectName', 'Test');
    fixture.componentRef.setInput('projectStatus', ProjectStatus.Complete);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.chipClicked.subscribe((v: string) =>
      emitted.push(v)
    );

    fixture.debugElement.query(By.css('.project-chip')).nativeElement.click();
    expect(emitted).toEqual(['Test']);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to project page when projectId is set', () => {
    fixture.componentRef.setInput('projectName', 'Test');
    fixture.componentRef.setInput('projectStatus', ProjectStatus.Complete);
    fixture.componentRef.setInput('projectId', 'abc-123');
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.chipClicked.subscribe((v: string) =>
      emitted.push(v)
    );

    fixture.debugElement.query(By.css('.project-chip')).nativeElement.click();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects', 'abc-123']);
    expect(emitted).toEqual([]);
  });
});
