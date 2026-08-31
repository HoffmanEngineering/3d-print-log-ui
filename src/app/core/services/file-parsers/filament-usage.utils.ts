const MATERIAL_DENSITIES = [
  ['PLA', 1.24],
  ['ABS', 1.04],
  ['PETG', 1.23],
  ['Nylon', 1.06],
] as const;

export function calculateFilamentWeightInMg(
  filamentType: string,
  lengthInMm: number,
  diameterInMm: number
): number | undefined {
  const materialDensity = MATERIAL_DENSITIES.find(([material]) =>
    filamentType.includes(material)
  )?.[1];

  if (materialDensity === undefined) {
    return undefined;
  }

  const radiusInMm = diameterInMm / 2;
  const filamentAreaInMm2 = Math.PI * radiusInMm * radiusInMm;
  const volumeInCubicMm = filamentAreaInMm2 * lengthInMm;
  const weightInGrams = volumeInCubicMm * (materialDensity / 1000);

  return Math.floor(weightInGrams * 1000);
}
