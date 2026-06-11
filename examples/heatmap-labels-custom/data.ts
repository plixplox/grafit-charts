export function getData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weeks = ['W1', 'W2', 'W3', 'W4'];
  const data: Array<{ week: string; day: string; deploys: number }> = [];
  weeks.forEach((week, w) => {
    days.forEach((day, d) => {
      data.push({ week, day, deploys: ((w * 5 + d * 3) % 11) + (d === 2 ? 6 : 1) });
    });
  });
  return data;
}
