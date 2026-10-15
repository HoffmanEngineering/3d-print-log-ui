import { Clipboard } from '@angular/cdk/clipboard';
import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import {
  ApiKeyService,
  UserApiKeySummary,
} from '../core/services/api-key.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { PushPermissionPromptService } from '../core/services/push-permission-prompt.service';

export interface UserApiKeySummaryWithKey extends UserApiKeySummary {
  privateKey?: string;
}

@Component({
  selector: 'app-apikeys',
  templateUrl: './apikeys.component.html',
  styleUrls: ['./apikeys.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApikeysComponent implements OnInit {
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly clipboard = inject(Clipboard);
  private readonly toastrService = inject(ToastrService);
  private readonly metaService = inject(MetaTagService);

  readonly keys = signal<UserApiKeySummary[]>([]);
  readonly loading = signal(false);

  public displayedColumns: string[] = [
    'description',
    'key',
    'created',
    'delete',
  ];

  readonly addingKey = signal(false);

  public newKeyDescription = '';

  private readonly pushPermissionPrompt = inject(PushPermissionPromptService);

  ngOnInit(): void {
    this.metaService.setTitle('Personal Api Keys | 3D Print Log');

    this.loading.set(true);
    this.apiKeyService.getApiKeySummaryForUser().subscribe((keys) => {
      this.keys.set(keys);
      this.loading.set(false);
    });
  }

  startAddNewKey() {
    this.newKeyDescription = '';
    this.addingKey.set(true);
  }

  cancelAddNewKey() {
    this.newKeyDescription = '';
    this.addingKey.set(false);
  }

  addNewKey() {
    this.apiKeyService.createNewApiKey(this.newKeyDescription).subscribe(
      (newKey) => {
        this.newKeyDescription = '';
        this.addingKey.set(false);

        const newSummary: UserApiKeySummaryWithKey = {
          description: newKey.description,
          id: newKey.id,
          isDeleted: false,
          privateKey: newKey.publicKey,
          createdDate: new Date(),
          updatedDate: new Date(),
          createdById: -1,
          updatedById: -1,
        };
        this.keys.update((keys) => [newSummary, ...keys]);
        this.toastrService.success('Key created successfully.');

        // The moment the app gains the ability to tell the user something time-sensitive:
        // a key exists, so a printer can now report that a print finished or failed.
        // A no-op outside the Cordova app and when permission is already granted.
        void this.pushPermissionPrompt.promptInContext(
          'You just created an API key, so your printer can report print progress.'
        );
      },
      (_) => {
        this.toastrService.error(
          'An error occurred while creating key. Try again in a few seconds.'
        );
      }
    );
  }

  public copyToClipboard(key: string) {
    this.clipboard.copy(key);
    this.toastrService.success('Key Copied to Clipboard', 'Success');
  }

  deleteKey(keyId: string) {
    this.apiKeyService.deleteApiKey(keyId).subscribe(
      (_) => {
        this.keys.update((keys) => keys.filter((key) => key.id !== keyId));
        this.toastrService.success('Key deleted successfully');
      },
      (_) => {
        this.toastrService.error(
          'An error occurred while deleting key. Try again in a few seconds.'
        );
      }
    );
  }
}
