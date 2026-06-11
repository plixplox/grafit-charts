export function getData() {
  const data = [];
  for (let i = 0; i < 12; i++) {
    data.push({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      fact: Math.round(80 + 30 * Math.sin(i / 1.8) + i * 2),
      plan: Math.round(85 + i * 2.4),
      lastYear: Math.round(70 + 26 * Math.sin(i / 1.8 + 0.6) + i * 1.6),
    });
  }
  return data;
}
