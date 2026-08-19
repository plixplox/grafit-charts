import type { ChartOptions } from './options';
import { defaultRegistry } from '@/app/registry';
import { applyThemeOverrides, resolveTheme, type ResolvedTheme } from '@/app/themes';
import type { ChartState } from '@/features/chart-state';
import type { ContextMenuApi, ContextMenuItem } from '@/features/context-menu';
import { canvasDataUrl, downloadCanvas, type DownloadOptions } from '@/features/export';
import { localize } from '@/features/locale';
import { Animator, planDataTransition, type AnimationOptions } from '@/shared/animation';
import { InteractionManager } from '@/shared/interaction';
import { warnMissingFeature, type ChartKind } from '@/shared/kernel';
import type { DomainAnchor, ImperativeOptions, NodeRef, SelectedNode, ZoomWindow } from '@/shared/kernel';
import { deepMerge, type DeepPartial } from '@/shared/options';
import { DomCanvas, FontWatcher, RenderScheduler, Scene, watchDocumentFonts, type CanvasFactory } from '@/shared/scene';

/**
 * Floor under a size measured off the container, and the only size a chart in a
 * container with no box at all would have had. `minWidth`/`minHeight` move it —
 * `0` takes it away, and a chart is then as small as the tile it was given.
 */
const DEFAULT_MIN_WIDTH = 300;
const DEFAULT_MIN_HEIGHT = 200;

export interface ChartInstance {
  update(options: ChartOptions): Promise<void>;
  updateDelta(patch: DeepPartial<ChartOptions>): Promise<void>;
  getOptions(): ChartOptions;
  getState(): ChartState;
  setState(state: ChartState): Promise<void>;
  /** Resolves after the scheduled render — including the redraw a still-loading web font triggers. */
  waitForUpdate(): Promise<void>;
  /**
   * Everything the pointer does, addressed by datum. These are the interactions
   * themselves, not fake events: they run the same code a real hover or click
   * does, so the listeners fire — pass `{ silent: true }` to keep them quiet,
   * which is what an app driving the chart from its own state usually wants.
   *
   * They render on the same schedule as the rest: await `waitForUpdate()` when
   * the next line depends on the frame being on screen.
   */
  showTooltip(target: NodeRef): boolean;
  hideTooltip(): void;
  /** Runs a click on a node: nodeClick plus the selection it would cause. */
  clickNode(target: NodeRef, options?: ImperativeOptions): boolean;
  getSelection(): SelectedNode[];
  setSelection(targets: NodeRef[], options?: ImperativeOptions): void;
  clearSelection(options?: ImperativeOptions): void;
  isZoomed(): boolean;
  /** Zoom window per axis, as fractions of the full domain. */
  zoomTo(window: { x?: ZoomWindow; y?: ZoomWindow }, options?: ImperativeOptions): void;
  /** Window sized to a number of items, the way zoom.visibleCount sizes it at startup. */
  zoomToCount(count: number, options?: ImperativeOptions & { anchor?: DomainAnchor }): void;
  resetZoom(options?: ImperativeOptions): void;
  getImageDataURL(options?: DownloadOptions): string;
  download(options?: DownloadOptions): void;
  destroy(): void;
}

export function createChart(options: ChartOptions): ChartInstance {
  const container = options.container;
  if (!container) {
    throw new Error('grafit: options.container is required');
  }

  let currentOptions = options;
  if (typeof getComputedStyle === 'function' && getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  // the whole scene is drawn on a single canvas; layers are groups on the scene graph
  const canvasFactory: CanvasFactory = (canvasWidth, canvasHeight) => {
    const sceneCanvas = new DomCanvas(canvasWidth, canvasHeight);
    Object.assign(sceneCanvas.element.style, { position: 'absolute', left: '0', top: '0' });
    container.appendChild(sceneCanvas.element);
    return sceneCanvas;
  };
  // `width`/`height` say what the size is, `responsive` says who measures it —
  // two questions one option used to answer at once. Unset, it still reads the
  // numbers: a chart told both of them has nothing left to follow.
  const isResponsive = options.responsive ?? (options.width === undefined || options.height === undefined);
  // asked for outright, the observer has the say and the numbers are demoted to
  // the size the chart starts at
  const sizeIsStartOnly = options.responsive === true;
  const scene = new Scene(canvasFactory, ...measure(container, options, sizeIsStartOnly));
  const scheduler = new RenderScheduler(() => scene.render());
  const requestRender = () => void scheduler.schedule();

  /** Composites all layers into a single canvas (PNG export). */
  function compositeCanvas(): HTMLCanvasElement {
    const out = document.createElement('canvas');
    const ratio = globalThis.devicePixelRatio ?? 1;
    out.width = Math.round(scene.width * ratio);
    out.height = Math.round(scene.height * ratio);
    const ctx = out.getContext('2d');
    if (ctx) scene.composite((image) => ctx.drawImage(image as CanvasImageSource, 0, 0));
    return out;
  }

  const firstType = options.series?.[0]?.type;
  const chartKind = (firstType && defaultRegistry.getSeries(firstType)?.chartKind) ?? 'cartesian';
  const widgetModule = defaultRegistry.getChart(chartKind);
  if (!widgetModule) {
    throw new Error(
      `grafit: chart widget for chartKind "${chartKind}" is not registered. ` +
        `Import ${chartWidgetModuleName(chartKind)} from 'grafit-charts/modules' and pass it to register() from 'grafit-charts/core', ` +
        `or use the full 'grafit-charts' entry point.`,
    );
  }
  const widget = widgetModule.create(scene, defaultRegistry, requestRender, container);
  const contextMenu = defaultRegistry.getFeature<ContextMenuApi>('context-menu')?.create(container);

  const interaction = new InteractionManager(container, (event) => {
    switch (event.type) {
      case 'move':
        widget.handlePointerMove(event.x, event.y);
        break;
      case 'leave':
        widget.handlePointerLeave();
        break;
      case 'click':
        widget.handleClick(event.x, event.y);
        break;
      case 'dblclick':
        widget.handleDoubleClick();
        break;
      case 'wheel':
        widget.handleWheel(event.x, event.y, event.deltaY, event.preventDefault);
        break;
      case 'drag-start':
        widget.handleDragStart(event.x, event.y, event.modifiers);
        break;
      case 'drag-move':
        widget.handleDragMove(event.x, event.y, event.dx, event.dy);
        break;
      case 'drag-end':
        widget.handleDragEnd(event.x, event.y);
        break;
      case 'pinch':
        widget.handlePinch?.(event.x, event.y, event.scale);
        break;
      case 'contextmenu': {
        const menuOptions = currentOptions.contextMenu;
        if (!menuOptions || menuOptions.enabled === false) break;
        if (!contextMenu) {
          warnMissingFeature('context-menu');
          break;
        }
        event.preventDefault();
        const items: ContextMenuItem[] = [
          { label: localize(currentOptions.locale, 'downloadPng'), action: () => downloadCanvas(compositeCanvas()) },
        ];
        if (widget.isZoomed()) {
          items.push({ label: localize(currentOptions.locale, 'resetZoom'), action: () => widget.resetZoom() });
        }
        items.push(...(menuOptions.extraItems ?? []));
        contextMenu.show(items, event.x, event.y, currentTheme);
        break;
      }
    }
  });

  let previousData: ChartOptions['data'];
  let destroyed = false;
  let fontGeneration = 0;
  let fontsSettled: Promise<void> = Promise.resolve();
  let transitionSettled: Promise<void> = Promise.resolve();
  let fontsAutoReload = true;
  const fontWatcher = new FontWatcher();
  const dataTransition = new Animator();
  // the DOM chrome (context menu) is drawn outside applyOptions and needs the live theme
  let currentTheme: ResolvedTheme = resolveTheme(options.theme);

  let warnedEmptySize = false;
  function warnEmptySize(): void {
    if (warnedEmptySize) return;
    warnedEmptySize = true;
    console.warn(
      'grafit: the container has no size — nothing was drawn. ' +
        'The chart draws itself as soon as the container has a box; give it one, or a width/height, or a minWidth/minHeight.',
    );
  }

  /** Takes the size the options ask for now — they carry minWidth/minHeight too. */
  const syncSceneSize = (): void => {
    const [width, height] = measure(container, currentOptions, sizeIsStartOnly);
    if (width === scene.width && height === scene.height) return;
    // the box went away; the layout on screen is the one it comes back to
    if (isEmptySize(width, height) && !isEmptySize(scene.width, scene.height)) return;
    scene.resize(width, height);
  };

  function applyOptions(): Promise<void> {
    const effective = applyThemeOverrides(currentOptions);
    validateSeriesOptions(effective);
    const theme = resolveTheme(effective.theme);
    currentTheme = theme;
    syncFonts(effective, theme);
    const oldData = previousData;
    previousData = effective.data;
    // a transition in flight is left where it stands: the frames it drew are
    // where the next one starts from, so a chart updated twice in a row moves
    // on from what is on screen instead of jumping back
    dataTransition.stop();

    // the options are applied once, at the values the update arrives at: the
    // series, the axes and the legend are built here, and the data alone moves
    // from frame to frame after that
    widget.setOptions(effective as never, theme);

    // nothing to lay out on: a container with no box — a hidden tab, a parent
    // at display:none — only reachable once the floor was taken away. Laying
    // out at 0 would build a layout thrown away the moment the box appears, so
    // the chart waits for the ResizeObserver to bring it a size instead
    if (isEmptySize(scene.width, scene.height)) {
      warnEmptySize();
      transitionSettled = Promise.resolve();
      return Promise.resolve();
    }

    const setData = widget.setData?.bind(widget);
    const transition =
      oldData && effective.data && oldData !== effective.data && setData && transitionsEnabled(effective.animation)
        ? planDataTransition(oldData, effective.data, {
            key: effective.animation?.key,
            valueFields: widget.valueFields?.(),
          })
        : undefined;

    if (transition && setData) {
      const target = effective.data;
      transitionSettled = dataTransition.play(updateDuration(effective.animation), (t) => {
        const frame = transition(t);
        // where an update arriving mid-flight would pick the chart up from
        previousData = frame.data;
        setData(frame.data, { settled: target, weights: frame.weights, t });
        widget.layoutAndRender();
        requestRender();
      });
      return transitionSettled.then(() => scheduler.settled);
    }

    transitionSettled = Promise.resolve();
    widget.layoutAndRender();
    return scheduler.schedule();
  }

  /**
   * A web font applied through the options is usually still loading while the
   * chart already draws with a fallback face. Ask for it, then lay out and draw
   * again once it lands — text metrics decide axis, legend and label geometry.
   */
  function syncFonts(effective: ChartOptions, theme: ResolvedTheme): void {
    const token = ++fontGeneration;
    fontsAutoReload = effective.fonts?.autoReload !== false;
    // opted out: the first frame is the only one, whatever face the browser has
    if (!fontsAutoReload) {
      fontsSettled = Promise.resolve();
      return;
    }
    fontsSettled = fontWatcher
      .request(effective, theme.fontFamily)
      .then((loaded) => {
        // a newer applyOptions has taken over, or the chart is gone
        if (!loaded || destroyed || token !== fontGeneration) return;
        return redrawWithNewFonts();
      })
      .catch(() => undefined);
  }

  function redrawWithNewFonts(): Promise<void> {
    widget.layoutAndRender();
    return scheduler.schedule();
  }

  // fonts the page declares after the chart was built (a lazy CSS chunk,
  // document.fonts.add) never pass through applyOptions — catch them here
  const unwatchFonts = watchDocumentFonts(() => {
    if (destroyed || !fontsAutoReload || !fontWatcher.recheck()) return;
    void redrawWithNewFonts();
  });

  let resizeObserver: ResizeObserver | undefined;
  if (isResponsive && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      const [width, height] = measure(container, currentOptions, sizeIsStartOnly);
      if (width === scene.width && height === scene.height) return;
      // the container lost its box — hidden tab, display:none. The layout it has
      // is the one it will come back to, so it is kept rather than redone at 0
      if (isEmptySize(width, height)) return;
      scene.resize(width, height);
      widget.layoutAndRender();
      // RO callbacks fire after rAF but before paint, and scene.resize() has just
      // wiped the canvas bitmap — render synchronously, or this frame paints blank
      scene.render();
    });
    resizeObserver.observe(container);
  }

  // a11y: focus and keyboard navigation over points
  container.tabIndex = 0;
  container.setAttribute('role', 'img');
  if (options.title?.text) container.setAttribute('aria-label', options.title.text);
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  Object.assign(liveRegion.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
  } satisfies Partial<CSSStyleDeclaration>);
  container.appendChild(liveRegion);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      widget.handleKeyStep?.(event.key === 'ArrowRight' ? 1 : -1);
      const description = widget.describeHighlight?.();
      if (description) liveRegion.textContent = description;
      event.preventDefault();
    } else if (event.key === 'Escape') {
      widget.handlePointerLeave();
      liveRegion.textContent = '';
    }
  };
  container.addEventListener('keydown', onKeyDown);

  void applyOptions();

  return {
    update(next) {
      currentOptions = { ...next, container };
      syncSceneSize();
      return applyOptions();
    },
    updateDelta(patch) {
      currentOptions = deepMerge(currentOptions, patch);
      syncSceneSize();
      return applyOptions();
    },
    getOptions() {
      return { ...currentOptions };
    },
    getState() {
      return widget.getState();
    },
    setState(state) {
      widget.setState(state);
      widget.layoutAndRender();
      return scheduler.schedule();
    },
    async waitForUpdate() {
      await scheduler.settled;
      // data on its way to new values is an update still running
      await transitionSettled;
      // the web fonts may still be in flight; their redraw is part of the update
      await fontsSettled;
      await scheduler.settled;
    },
    showTooltip(target) {
      if (!widget.showTooltip) return warnUnsupported('showTooltip', chartKind);
      return widget.showTooltip(target);
    },
    hideTooltip() {
      if (widget.hideTooltip) widget.hideTooltip();
      else warnUnsupported('hideTooltip', chartKind);
    },
    clickNode(target, imperative) {
      if (!widget.clickNode) return warnUnsupported('clickNode', chartKind);
      return widget.clickNode(target, imperative);
    },
    getSelection() {
      return widget.getSelection?.() ?? [];
    },
    setSelection(targets, imperative) {
      if (widget.setSelection) widget.setSelection(targets, imperative);
      else warnUnsupported('setSelection', chartKind);
    },
    clearSelection(imperative) {
      if (widget.setSelection) widget.setSelection([], imperative);
      else warnUnsupported('clearSelection', chartKind);
    },
    isZoomed() {
      return widget.isZoomed();
    },
    zoomTo(window, imperative) {
      if (widget.zoomTo) widget.zoomTo(window, imperative);
      else warnUnsupported('zoomTo', chartKind);
    },
    zoomToCount(count, imperative) {
      if (widget.zoomToCount) widget.zoomToCount(count, imperative);
      else warnUnsupported('zoomToCount', chartKind);
    },
    resetZoom(imperative) {
      widget.resetZoom(imperative);
    },
    getImageDataURL(downloadOptions) {
      return canvasDataUrl(compositeCanvas(), downloadOptions);
    },
    download(downloadOptions) {
      downloadCanvas(compositeCanvas(), downloadOptions);
    },
    destroy() {
      destroyed = true;
      dataTransition.stop();
      unwatchFonts();
      liveRegion.remove();
      container.removeEventListener('keydown', onKeyDown);
      resizeObserver?.disconnect();
      interaction.destroy();
      contextMenu?.destroy();
      widget.destroy();
      scene.destroy();
    },
  };
}

const warnedCalls = new Set<string>();

/**
 * A pie has no zoom and a sankey has no zoom either: the call is a no-op there,
 * and silence would read as a bug. Warned once per chart kind and method.
 */
function warnUnsupported(method: string, chartKind: ChartKind): false {
  const key = `${chartKind}.${method}`;
  if (!warnedCalls.has(key)) {
    warnedCalls.add(key);
    console.warn(`grafit: ${method}() is not supported by the ${chartKind} chart — the call did nothing.`);
  }
  return false;
}

/** Validates module registration and required series options. */
function validateSeriesOptions(options: ChartOptions): void {
  for (const series of options.series ?? []) {
    const module = defaultRegistry.getSeries(series.type);
    if (!module) {
      throw new Error(
        `grafit: series type "${series.type}" is not registered. ` +
          `Import the module from 'grafit-charts/modules' and pass it to register() from 'grafit-charts/core', ` +
          `or use the full 'grafit-charts' entry point.`,
      );
    }
    if (!module.requiredOptions) continue;
    const missing = module.requiredOptions.filter((key) => (series as unknown as Record<string, unknown>)[key] === undefined);
    if (missing.length > 0) {
      throw new Error(`grafit: series "${series.type}" is missing required options: ${missing.join(', ')}`);
    }
  }
}

/** Default length of an update transition, ms — shorter than an entrance, which has further to travel. */
const DEFAULT_UPDATE_MS = 450;

/**
 * Whether new data flows into place. `enabled` speaks for both animations;
 * `updateEnabled` speaks for this one, and wins wherever it was set — a chart
 * that should appear at once and move afterwards asks for exactly that.
 */
function transitionsEnabled(animation: AnimationOptions | undefined): boolean {
  return animation?.updateEnabled ?? animation?.enabled !== false;
}

/** `duration` stands in when nothing was said about updates in particular. */
function updateDuration(animation: AnimationOptions | undefined): number {
  return animation?.updateDuration ?? animation?.duration ?? DEFAULT_UPDATE_MS;
}

/**
 * The size of the scene, per axis: what the container measures, held at the
 * floor `minWidth`/`minHeight` set, and replaced outright by a numeric
 * `width`/`height`. With `startOnly` — `responsive: true` — those numbers are
 * no longer the answer but the fallback, taken only while the container has no
 * box of its own to measure.
 */
function measure(container: HTMLElement, options: ChartOptions, startOnly: boolean): [number, number] {
  let width = Math.max(container.clientWidth, options.minWidth ?? DEFAULT_MIN_WIDTH);
  let height = Math.max(container.clientHeight, options.minHeight ?? DEFAULT_MIN_HEIGHT);
  if (options.width !== undefined && (!startOnly || width <= 0)) width = options.width;
  if (options.height !== undefined && (!startOnly || height <= 0)) height = options.height;
  return [width, height];
}

/** No box to draw in: a hidden container, or one whose floor was set to 0. */
function isEmptySize(width: number, height: number): boolean {
  return width <= 0 || height <= 0;
}

/** Exported widget module name for the error message. */
function chartWidgetModuleName(chartKind: ChartKind): string {
  switch (chartKind) {
    case 'polar':
      return 'polarChartModule';
    case 'hierarchy':
    case 'flow':
      return 'standaloneChartModule';
    default:
      return 'cartesianChartModule';
  }
}
