import type { BandScale } from './band-scale';
import type { LinearScale } from './linear-scale';

export { LinearScale } from './linear-scale';
export { BandScale, DEFAULT_GROUP_GAP, groupSlot } from './band-scale';
export { bandLayout, closestSpan, type Band, type BandLayout } from './band-layout';
export { LogScale } from './log-scale';
export { TimeScale, toTimestamp, type TimeUnit } from './time-scale';
export { ColorScale } from './color-scale';

/**
 * Any chart scale; the concrete type is distinguished via instanceof
 * (LogScale and TimeScale extend LinearScale).
 */
export type AnyScale = LinearScale | BandScale<unknown>;
