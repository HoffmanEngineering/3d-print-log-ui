import { Injectable } from '@angular/core';
import { GcodeParserBase } from '../core/gcode-parser-base';
import { GcodeSettings, SPACED_EQUALS_OR_COLON } from '../core/gcode-settings';
import {
  buildOrcaFamilyNotes,
  ORCA_FAMILY_SETTING_KEYS,
} from '../orca/orca-notes';

/**
 * Bambu Studio writes the same settings block as OrcaSlicer (Orca is a fork of
 * it), but some header lines use ": " instead of " = ".
 */
@Injectable({
  providedIn: 'root',
})
export class BambuStudioFileParserService extends GcodeParserBase {
  readonly slicerName = 'Bambu Studio';
  readonly settingsOptions = SPACED_EQUALS_OR_COLON;
  readonly settingKeys = ORCA_FAMILY_SETTING_KEYS;

  detect(gcode: string): boolean {
    return /^\s*; BambuStudio /m.test(gcode);
  }

  protected buildNotes(settings: GcodeSettings, gcode: string): string {
    return buildOrcaFamilyNotes(settings, gcode);
  }
}
