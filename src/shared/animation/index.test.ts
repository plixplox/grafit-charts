import { Animator, easeOutCubic } from './index';
import { describe, expect, it, vi } from 'vitest';

describe('easeOutCubic', () => {
  it('curve endpoints and midpoint', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBe(0.875);
  });
});

describe('Animator', () => {
  // Node has no requestAnimationFrame — play completes instantly.
  it('without rAF completes the animation in a single frame', () => {
    const animator = new Animator();
    const onFrame = vi.fn();
    animator.play(600, onFrame);
    expect(animator.t).toBe(1);
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalledWith(1);
  });

  it('zero duration completes instantly', () => {
    const animator = new Animator();
    const onFrame = vi.fn();
    animator.play(0, onFrame);
    expect(animator.t).toBe(1);
    expect(onFrame).toHaveBeenCalledWith(1);
  });

  it('stop resets the factor to 1', () => {
    const animator = new Animator();
    animator.t = 0.4;
    animator.stop();
    expect(animator.t).toBe(1);
  });
});
