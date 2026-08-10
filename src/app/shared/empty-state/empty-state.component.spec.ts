import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `<app-empty-state
    [icon]="icon"
    [heading]="heading"
    [message]="message"
    [announce]="announce"
  >
    <button type="button" data-cy="test-action">Do the thing</button>
  </app-empty-state>`,
})
class HostComponent {
  icon = 'inbox';
  heading = 'Nothing here yet';
  message = 'Add something to get started.';
  announce = true;
}

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('should render the icon, heading and message', () => {
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.css('.empty-state__icon'))
      .nativeElement as HTMLElement;
    const heading = fixture.debugElement.query(By.css('.empty-state__heading'))
      .nativeElement as HTMLElement;
    const message = fixture.debugElement.query(By.css('.empty-state__message'))
      .nativeElement as HTMLElement;

    expect(icon.textContent.trim()).toEqual('inbox');
    expect(heading.textContent.trim()).toEqual('Nothing here yet');
    expect(message.textContent.trim()).toEqual('Add something to get started.');
  });

  it('should hide the icon from assistive technology', () => {
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.css('.empty-state__icon'))
      .nativeElement as HTMLElement;

    expect(icon.getAttribute('aria-hidden')).toEqual('true');
  });

  it('should omit the message paragraph when no message is supplied', () => {
    host.message = '';
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.empty-state__message'))
    ).toBeNull();
  });

  it('should project action content', () => {
    fixture.detectChanges();

    const action = fixture.debugElement.query(
      By.css('.empty-state__actions [data-cy="test-action"]')
    );

    expect(action).toBeTruthy();
  });

  it('should act as a polite live region by default', () => {
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(
      By.directive(EmptyStateComponent)
    ).nativeElement as HTMLElement;

    expect(emptyState.getAttribute('role')).toEqual('status');
  });

  it('should drop the live region role when announce is false', () => {
    host.announce = false;
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(
      By.directive(EmptyStateComponent)
    ).nativeElement as HTMLElement;

    expect(emptyState.hasAttribute('role')).toBeFalse();
  });
});
