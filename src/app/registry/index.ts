/**
 * Global module registry. Deliberately imports no concrete module —
 * this lets the grafit/core entry point avoid pulling in series and axes
 * the user has not registered (tree-shaking).
 */
import { ModuleRegistry, type ChartModule } from '@/shared/kernel';

export const defaultRegistry = new ModuleRegistry();

/** Registers series/axis modules (grafit/core entry point). */
export function register(...modules: ChartModule[]): void {
  defaultRegistry.register(...modules);
}
