import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ProjectChipComponent } from './project-chip.component';
import { ProjectStatus } from 'src/app/core/services/project.service';

describe('ProjectChipComponent', () => {
  let fixture: ComponentFixture<ProjectChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectChipComponent],
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

  it('should emit clicked event on click', () => {
    fixture.componentRef.setInput('projectName', 'Test');
    fixture.componentRef.setInput('projectStatus', ProjectStatus.Complete);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.chipClicked.subscribe((v: string) =>
      emitted.push(v)
    );

    fixture.debugElement.query(By.css('.project-chip')).nativeElement.click();
    expect(emitted).toEqual(['Test']);
  });
});
