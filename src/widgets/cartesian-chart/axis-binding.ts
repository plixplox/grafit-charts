/**
 * With two value axes on a chart the question is which series is read off
 * which one. An axis answers it with `keys`: the value fields (or series ids)
 * it carries. Everything unclaimed goes to the first axis that asked for
 * nothing in particular — so a single-axis chart never notices any of this.
 */

/** What the binding needs to know about a series. */
export interface BindableSeries {
  readonly id: string;
  axisKeys?(): string[];
}

/** What it needs to know about a value axis. */
export interface BindableAxis {
  readonly keys?: readonly string[];
}

/**
 * Maps series id → the value axis it is drawn against. Axes are matched in
 * declaration order; a series matching none of the `keys` falls back to the
 * first axis without keys, and failing that to the first axis at all.
 */
export function bindSeriesToValueAxes<S extends BindableSeries, A extends BindableAxis>(series: S[], axes: A[]): Map<string, A> {
  const binding = new Map<string, A>();
  const fallback = axes.find((axis) => axis.keys === undefined) ?? axes[0];
  if (!fallback) return binding;
  for (const instance of series) {
    const keys = instance.axisKeys?.() ?? [];
    const matched = axes.find((axis) => axis.keys?.some((key) => key === instance.id || keys.includes(key)));
    binding.set(instance.id, matched ?? fallback);
  }
  return binding;
}
