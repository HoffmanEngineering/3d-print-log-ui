import { GcodeSettings } from '../core/gcode-settings';

/** Every key buildOrcaFamilyNotes reads; Orca-family parsers score against this list. */
export const ORCA_FAMILY_SETTING_KEYS: readonly string[] = [
  'print_settings_id',
  'printer_settings_id',
  'spiral_mode',
  'layer_height',
  'top_shell_layers',
  'bottom_shell_layers',
  'wall_loops',
  'sparse_infill_density',
  'sparse_infill_pattern',
  'support_filament',
  'support_on_build_plate_only',
  'ooze_prevention',
  'draft_shield',
];

/**
 * Shared by OrcaSlicer, Bambu Studio and Anycubic Slicer, which all write the
 * same settings block.
 */
export function buildOrcaFamilyNotes(
  settings: GcodeSettings,
  gcode: string
): string {
  let notes = '';

  const settingId = settings.get('print_settings_id');
  if (settingId !== '') {
    notes += `Print Setting Config: ${settingId}\n`;
  }
  const printerConfigId = settings.get('printer_settings_id');
  if (printerConfigId !== '') {
    notes += `Printer Config: ${printerConfigId}\n`;
  }

  const spiralVaseModeEnabled = settings.getNumber('spiral_mode') === 1;

  const layerCount =
    gcode.match(/total layer number: (.+)$/im)?.[1]?.trim() ?? '';
  if (layerCount) {
    notes += `Layer Count: ${layerCount}\n`;
  }

  const layerHeight = settings.getNumber('layer_height');
  if (layerHeight) {
    notes += `Layer Height: ${layerHeight}mm\n`;
  }

  const topLayers = settings.getNumber('top_shell_layers');
  if (topLayers) {
    notes += `Top Layer Count: ${topLayers}\n`;
  }

  const bottomLayers = settings.getNumber('bottom_shell_layers');
  if (bottomLayers) {
    notes += `Bottom Layer Count: ${bottomLayers}\n`;
  }

  const perimeters = settings.getNumber('wall_loops');
  if (perimeters) {
    notes += `Walls: ${perimeters}\n`;
  }

  const infillDensity = settings.get('sparse_infill_density');
  if (infillDensity !== '') {
    notes += `Infill: ${infillDensity}\n`;
    const infillPattern = settings.get('sparse_infill_pattern');
    if (infillPattern !== '') {
      notes += `Infill Pattern: ${infillPattern}\n`;
    }
  }

  if (settings.getNumber('support_filament') === 1) {
    const buildplateOnly =
      settings.getNumber('support_on_build_plate_only') === 1;
    const supportType = buildplateOnly ? 'Touching Buildplate' : 'Everywhere';
    notes += `Support: Enabled ${supportType}`.trim() + '\n';
  } else {
    notes += 'Support: No Supports\n';
  }

  if (spiralVaseModeEnabled) {
    notes += 'Spiral Vase Mode: Enabled\n';
  }

  if (settings.getNumber('ooze_prevention') === 1) {
    notes += 'Ooze Prevention: Enabled\n';
  }

  if (settings.get('draft_shield') === 'enabled') {
    notes += 'Draft Shield: Enabled\n';
  }

  notes = notes.trim();
  if (notes !== '') {
    notes = 'Print Settings:\n' + notes;
  }
  return notes;
}
