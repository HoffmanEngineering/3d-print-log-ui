import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { BottleIconComponent } from '../bottle-icon/bottle-icon.component';
import { FilamentSpoolIconComponent } from '../filament-spool-icon/filament-spool-icon.component';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

@Component({
  selector: 'app-material-icon',
  templateUrl: './material-icon.component.html',
  styleUrls: ['./material-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilamentSpoolIconComponent, BottleIconComponent],
})
export class MaterialIconComponent {
  color = input<string>('');
  categoryNickname = input<string>('');
  colorPattern = input<ColorPatternType>(ColorPatternType.Solid);
  colors = input<string[]>([]);
  finishType = input<FilamentFinishType>(FilamentFinishType.Standard);
  effects = input<FilamentEffect[]>([]);

  protected isSpoolType = computed(() =>
    ['filament', 'wire'].includes(this.categoryNickname())
  );
}
