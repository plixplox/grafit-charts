const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const teams = ['Onboarding', 'Retention', 'Enterprise', 'Self-serve', 'Partnerships'];

export function getData() {
  const rows: Array<{ team: [string, string]; revenue: number }> = [];
  for (const [q, quarter] of quarters.entries()) {
    for (const [t, team] of teams.entries()) {
      rows.push({ team: [quarter, `${team} ${quarter}`], revenue: 40 + ((q * 5 + t * 7) % 9) * 11 });
    }
  }
  return rows;
}
