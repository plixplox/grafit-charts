/** Services the dashboard watches; a reading shows a few of them at a time. */
const SERVICES = ['auth', 'search', 'checkout', 'catalog', 'billing', 'media', 'notify'];

/** A type rather than an interface: a chart takes rows as `Datum`, and only a type alias reads as one. */
export type Reading = {
  service: string;
  requests: number;
};

/** The starting frame, fixed — a demo that opens differently every time is hard to read. */
export function getData(): Reading[] {
  return [
    { service: 'auth', requests: 820 },
    { service: 'search', requests: 1340 },
    { service: 'checkout', requests: 460 },
    { service: 'catalog', requests: 1180 },
    { service: 'billing', requests: 240 },
  ];
}

/** The same services, read again: every bar walks to a new height. */
export function newValues(previous: Reading[]): Reading[] {
  return previous.map((row) => ({ service: row.service, requests: drift(row.requests) }));
}

/**
 * A different handful of services. The ones that stayed keep the load they had
 * and carry on from it; the rest arrive and leave — which is what `key` is for.
 */
export function newServices(previous: Reading[]): Reading[] {
  return pickServices(previous.length).map((service) => ({
    service,
    requests: drift(previous.find((row) => row.service === service)?.requests ?? 600),
  }));
}

/** A random handful, in a stable order — the axis should not reshuffle on its own. */
function pickServices(count: number): string[] {
  const pool = [...SERVICES];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return picked.sort((a, b) => SERVICES.indexOf(a) - SERVICES.indexOf(b));
}

/** Within ±35% of the previous value, clamped to a plausible range. */
function drift(value: number): number {
  return Math.round(Math.min(1600, Math.max(120, value * (0.65 + Math.random() * 0.7))));
}
