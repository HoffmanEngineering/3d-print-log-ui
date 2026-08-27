import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectEditFormComponent } from './project-edit-form.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ProjectDetailDto,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';

const mockProject: ProjectDetailDto = {
  id: 'abc-123',
  name: 'Voron 2.4',
  reference: 'v2.4-350',
  description: 'My build',
  url: 'https://example.com',
  status: ProjectStatus.InProgress,
  viewStatus: ProjectViewStatus.Public,
  createdDate: new Date(),
  createdByUserId: 1,
  printCount: 0,
  totalPrintTimeInSeconds: 0,
  totalEstimatedPrintTimeInSeconds: 0,
  totalFilamentWeightMg: 0,
  images: [],
  startDate: '2026-03-02',
  finishDate: '2026-03-06',
  startDateOverride: null,
  finishDateOverride: null,
};

describe('ProjectEditFormComponent', () => {
  let fixture: ComponentFixture<ProjectEditFormComponent>;
  let component: ProjectEditFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectEditFormComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectEditFormComponent);
    fixture.componentRef.setInput('project', mockProject);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('should populate name field from project input', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="name-input"]'
    );
    expect(input.value).toBe('Voron 2.4');
  });

  it('should populate reference field from project input', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="reference-input"]'
    );
    expect(input.value).toBe('v2.4-350');
  });

  it('should emit saved event with form values on valid submit', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ name: 'Updated Name' });
    component.onSubmit();

    expect(savedValues.length).toBe(1);
    expect(savedValues[0].name).toBe('Updated Name');
    expect(savedValues[0].viewStatus).toBe(ProjectViewStatus.Public);
  });

  it('should not emit saved when name is empty', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ name: '' });
    component.onSubmit();

    expect(savedValues.length).toBe(0);
  });

  it('should emit cancelled event on cancel', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.onCancel();

    expect(cancelled).toBe(true);
  });

  it('should not emit saved when name exceeds 100 characters', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ name: 'a'.repeat(101) });
    component.onSubmit();

    expect(savedValues.length).toBe(0);
  });

  it('should not emit saved when reference exceeds 100 characters', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ reference: 'a'.repeat(101) });
    component.onSubmit();

    expect(savedValues.length).toBe(0);
  });

  it('should not emit saved when description exceeds 5000 characters', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ description: 'a'.repeat(5001) });
    component.onSubmit();

    expect(savedValues.length).toBe(0);
  });

  it('should not emit saved when url exceeds 1000 characters', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ url: 'a'.repeat(1001) });
    component.onSubmit();

    expect(savedValues.length).toBe(0);
  });
});
