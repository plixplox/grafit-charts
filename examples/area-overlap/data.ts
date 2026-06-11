export function getData() {
  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    data.push({
      hour: `${String(hour).padStart(2, '0')}:00`,
      mobile: Math.round(40 + 35 * Math.exp(-((hour - 20) ** 2) / 18) + 25 * Math.exp(-((hour - 8) ** 2) / 10)),
      desktop: Math.round(20 + 55 * Math.exp(-((hour - 14) ** 2) / 22)),
    });
  }
  return data;
}
