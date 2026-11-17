import { Injectable } from '@angular/core';
import { PrintFilamentSummaryDto } from '../../print.service';
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

  /**
   * Bambu Studio does not write Orca's "; filament used [mm] =" lines (they are
   * commented out in its GCode.cpp). Its header has
   * "; total filament length [mm] : a,b" and "; total filament weight [g] : a,b"
   * instead, with one value per filament the plate used, in filament order.
   */
  protected override getFilamentUsage(
    settings: GcodeSettings
  ): PrintFilamentSummaryDto[] {
    if (settings.has(this.filamentLengthKey)) {
      return super.getFilamentUsage(settings);
    }

    const lengthsMm = settings.getNumberList('total filament length [mm]');
    const grams = settings.getNumberList('total filament weight [g]');
    const colors = settings.getStringList('filament_colour');
    const types = settings.getStringList('filament_type');
    // Unused filaments are left out of those lists, so an entry's index is its
    // slot only when every filament the project lists was used.
    const indexIsSlot = lengthsMm.length === colors.length;

    return this.buildUsageRows(lengthsMm, grams, (i) =>
      indexIsSlot
        ? this.describeFilamentSlot(i, colors[i], types[i])
        : `Filament ${i + 1}`
    );
  }
}
