/** Last-resort densities for gcode that has no filament_density line. */
export const MATERIAL_DENSITIES_G_PER_CM3 = {
  PLA: 1.24,
  ABS: 1.04,
  PETG: 1.23,
  Nylon: 1.06,
} as const;

/** Substring match, so "PLA-CF" and "PETG HF" still resolve. */
export function densityForMaterialType(
  filamentType: string
): number | undefined {
  const type = filamentType.toUpperCase();
  if (type.includes('PLA')) return MATERIAL_DENSITIES_G_PER_CM3.PLA;
  if (type.includes('ABS')) return MATERIAL_DENSITIES_G_PER_CM3.ABS;
  if (type.includes('PETG')) return MATERIAL_DENSITIES_G_PER_CM3.PETG;
  if (type.includes('NYLON') || type.includes('PA')) {
    return MATERIAL_DENSITIES_G_PER_CM3.Nylon;
  }
  return undefined;
}
