export function getData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['00', '04', '08', '12', '16', '20'];
  const data: Array<{ day: string; hour: string; load: number }> = [];
  days.forEach((day, d) => {
    hours.forEach((hour, h) => {
      const base = h === 2 || h === 3 ? 60 : h === 4 ? 45 : 15;
      const weekend = d >= 5 ? 0.5 : 1;
      data.push({ day, hour, load: Math.round(base * weekend + ((d * 7 + h * 3) % 13)) });
    });
  });
  return data;
}
