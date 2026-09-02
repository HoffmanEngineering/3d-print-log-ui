import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectEditFormComponent } from './project-edit-form.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ProjectDetailDto,
  ProjectEditFormValue,
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

  describe('date overrides', () => {
    /**
     * Builds a FRESH component for a given project. The shared beforeEach already ran
     * detectChanges, and the form is built in ngOnInit — replacing the input afterward would
     * not rebuild it, so each of these cases needs its own fixture.
     */
    function createWith(
      overrides: Partial<ProjectDetailDto>
    ): ProjectEditFormComponent {
      const local = TestBed.createComponent(ProjectEditFormComponent);
      local.componentRef.setInput('project', { ...mockProject, ...overrides });
      local.detectChanges();
      return local.componentInstance;
    }

    function emitFrom(local: ProjectEditFormComponent): ProjectEditFormValue {
      let emitted: ProjectEditFormValue | undefined;
      local.saved.subscribe((v) => (emitted = v));
      local.onSubmit();
      return emitted!;
    }

    it('populates date controls from the raw overrides, not the resolved dates', () => {
      const local = createWith({
        startDate: '2026-03-02',
        startDateOverride: null,
        finishDate: '2026-03-06',
        finishDateOverride: '2026-03-06',
      });

      // The resolved start is 2026-03-02, but it is DERIVED — the picker must stay empty or
      // the next save would silently pin a date the user never chose.
      expect(local.form.controls.startDateOverride.value).toBeNull();
      expect(local.form.controls.finishDateOverride.value).toEqual(
        new Date(2026, 2, 6)
      );
    });

    it('emits null for an empty picker', () => {
      const local = createWith({ startDateOverride: null });

      expect(emitFrom(local).startDateOverride).toBeNull();
    });

    it('serializes a picked date to its local calendar day', () => {
      const local = createWith({});
      local.form.controls.startDateOverride.setValue(new Date(2026, 1, 1));

      expect(emitFrom(local).startDateOverride).toBe('2026-02-01');
    });

    it('does not drift a day at the end of a year', () => {
      const local = createWith({});
      local.form.controls.startDateOverride.setValue(new Date(2026, 11, 31));

      expect(emitFrom(local).startDateOverride).toBe('2026-12-31');
    });

    it('round-trips an existing override unchanged', () => {
      const local = createWith({ startDateOverride: '2026-02-01' });

      expect(emitFrom(local).startDateOverride).toBe('2026-02-01');
    });

    it('clears an override through the clear button', () => {
      const local = TestBed.createComponent(ProjectEditFormComponent);
      local.componentRef.setInput('project', {
        ...mockProject,
        startDateOverride: '2026-02-01',
      });
      local.detectChanges();

      const clearButton: HTMLButtonElement = local.nativeElement.querySelector(
        '[data-cy="clear-start-date"]'
      );
      expect(clearButton)
        .withContext('clear button should render')
        .toBeTruthy();
      clearButton.click();

      expect(
        local.componentInstance.form.controls.startDateOverride.value
      ).toBeNull();
    });

    it('offers no clear button when the date is already automatic', () => {
      const local = TestBed.createComponent(ProjectEditFormComponent);
      local.componentRef.setInput('project', {
        ...mockProject,
        startDateOverride: null,
      });
      local.detectChanges();

      expect(
        local.nativeElement.querySelector('[data-cy="clear-start-date"]')
      ).toBeNull();
    });
  });
});
