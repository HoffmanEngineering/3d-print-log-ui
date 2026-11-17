import { Connection } from 'src/app/core/services/connection.service';

type SoftwareFields = Partial<
  Pick<
    Connection,
    | 'firmwareName'
    | 'firmwareVersion'
    | 'hostSoftwareName'
    | 'hostSoftwareVersion'
    | 'klipperVersion'
    | 'moonrakerVersion'
  >
>;

/**
 * What a connection's agent last reported about the printer's software, as display parts:
 * the firmware, then the host software (api#282). An older bridge only sends `klipperVersion` and
 * `moonrakerVersion`, which stand in for Klipper and Moonraker. A name shows without a version,
 * but a version without a name is dropped, since nothing would say what it is the version of.
 */
export function connectionSoftware(c: SoftwareFields): string[] {
  const firmware =
    part(c.firmwareName, c.firmwareVersion) ??
    part(clean(c.klipperVersion) ? 'Klipper' : null, c.klipperVersion);
  const host =
    part(c.hostSoftwareName, c.hostSoftwareVersion) ??
    part(clean(c.moonrakerVersion) ? 'Moonraker' : null, c.moonrakerVersion);
  return [firmware, host].filter((p): p is string => p !== null);
}

function part(
  name: string | null | undefined,
  version: string | null | undefined
): string | null {
  const n = clean(name);
  if (!n) {
    return null;
  }
  const v = clean(version);
  return v ? `${n} ${v}` : n;
}

function clean(value: string | null | undefined): string | null {
  return value?.trim() || null;
}
