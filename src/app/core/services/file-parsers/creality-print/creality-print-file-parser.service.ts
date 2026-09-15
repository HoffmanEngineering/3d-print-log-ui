import { Injectable } from '@angular/core';
import { PrintFilamentSummaryDto } from '../../print.service';
import { parseCuraStyleFilamentUsage } from '../core/cura-style-filament-usage';
import { GcodeParserBase } from '../core/gcode-parser-base';
import { GcodeSettings, UNSPACED_COLON } from '../core/gcode-settings';

const CREALITY_SETTING_KEYS: readonly string[] = [
  'TIME',
  'Filament used',
  'Layer Height',
  'FLAVOR',
];

@Injectable({
  providedIn: 'root',
})
export class CrealityPrintFileParserService extends GcodeParserBase {
  readonly slicerName = 'Creality Print';
  readonly settingsOptions = UNSPACED_COLON;
  readonly settingKeys = CREALITY_SETTING_KEYS;

  detect(gcode: string): boolean {
    return /Creality Print GCode/.test(gcode);
  }

  /** Creality writes the whole header as ";key:value" lines; keep it verbatim. */
  protected buildNotes(_settings: GcodeSettings, gcode: string): string {
    const settings = gcode.match(
      /;FLAVOR:Marlin([\s\S]*);---------------------End of Head--------------------------/im
    );
    if (!settings?.[1]) {
      return '';
    }
    const notes = settings[1].replace(/(^|\n);/g, '$1').trim();
    return 'Print Settings:\n' + notes;
  }

  protected override parseEstimatedPrintTime(
    _gcode: string,
    settings: GcodeSettings
  ): number | undefined {
    const seconds = settings.getNumber('TIME');
    return seconds ? Math.ceil(seconds) : undefined;
  }

  protected override getFilamentUsage(
    settings: GcodeSettings
  ): PrintFilamentSummaryDto[] {
    return parseCuraStyleFilamentUsage(settings.get('Filament used'));
  }
}
