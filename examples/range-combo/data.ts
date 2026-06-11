export function getData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month, i) => {
    const mid = 8 + 14 * Math.sin(((i - 3) / 12) * Math.PI * 2);
    return {
      month,
      min: Math.round(mid - 5 - (i % 3)),
      max: Math.round(mid + 6 + ((i + 1) % 3)),
      avg: Math.round(mid),
    };
  });
}
