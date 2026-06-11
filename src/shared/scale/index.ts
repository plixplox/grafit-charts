import type { BandScale } from './band-scale';
import type { LinearScale } from './linear-scale';

export { LinearScale } from './linear-scale';
export { BandScale } from './band-scale';
export { LogScale } from './log-scale';
export { TimeScale, toTimestamp, type TimeUnit } from './time-scale';
export { ColorScale } from './color-scale';

/**
 * Any chart scale; the concrete type is distinguished via instanceof
 * (LogScale and TimeScale extend LinearScale).
 */
export type AnyScale = LinearScale | BandScale<unknown>;
