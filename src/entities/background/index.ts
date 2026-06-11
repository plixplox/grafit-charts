import type { ThemeContext } from '@/shared/kernel';
import type { FillStyle, Switchable } from '@/shared/options';
import { Group, Rect } from '@/shared/scene';

export interface BackgroundOptions extends Switchable, FillStyle {
  visible?: boolean;
}

export function renderBackground(
  layer: Group,
  options: BackgroundOptions | undefined,
  theme: ThemeContext,
  width: number,
  height: number,
): void {
  if (options?.visible === false || options?.enabled === false) return;
  const rect = new Rect();
  rect.width = width;
  rect.height = height;
  rect.fill = options?.fill ?? theme.backgroundColor;
  rect.opacity = options?.fillOpacity ?? 1;
  layer.append(rect);
}
