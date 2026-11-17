/**
 * What each device scope lets a paired device do, in the order the list shows them.
 * The scopes are the API's `DeviceScopes` (3d-print-log-api#286); a scope added there and not
 * here is still shown, as its raw name.
 */
const DEVICE_SCOPE_LABELS: readonly (readonly [string, string])[] = [
  ['prints:write', 'log prints'],
  ['prints:read', 'see prints'],
  ['printers:read', 'see printers'],
  ['printers:create', 'add printers'],
  ['printers:slots', 'update printer slots'],
  ['filaments:read', 'see materials'],
  ['files:write', 'upload print files'],
  ['connections:write', 'send heartbeats'],
];

const KNOWN = new Map(DEVICE_SCOPE_LABELS);

/** "Log prints, update printer slots, send heartbeats" for a grant's scopes. */
export function describeDeviceScopes(scopes: readonly string[]): string {
  const held = new Set(scopes);
  const parts = [
    ...DEVICE_SCOPE_LABELS.filter(([scope]) => held.has(scope)).map(
      ([, label]) => label
    ),
    ...[...held].filter((scope) => !KNOWN.has(scope)),
  ];
  if (parts.length === 0) {
    return 'No permissions';
  }
  const sentence = parts.join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
