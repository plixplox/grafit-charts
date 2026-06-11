import type { Fraction, Switchable } from '@/shared/options';

/**
 * Highlights the node under the cursor and dims the other series.
 * Applied by series via CartesianRenderContext.highlight;
 * the state is managed by widgets/cartesian-chart.
 */
export interface HighlightOptions extends Switchable {
  /** Opacity of non-highlighted series (0..1, 0.8 by default). */
  dimOpacity?: Fraction;
}
