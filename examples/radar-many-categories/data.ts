/** Weekly signups over a year: a seasonal swell with a summer dip. */
export function getData() {
  return Array.from({ length: 52 }, (_, index) => {
    const week = index + 1;
    const seasonal = 60 + 28 * Math.sin((index / 52) * Math.PI * 2 - 0.6);
    const ripple = 6 * Math.sin(index / 3);
    return { week: `W${String(week).padStart(2, '0')}`, signups: Math.round(seasonal + ripple) };
  });
}
