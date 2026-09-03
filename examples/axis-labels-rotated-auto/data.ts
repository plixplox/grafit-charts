const districts = [
  'Basmanny',
  'Zamoskvorechye',
  'Krasnoselsky',
  'Meshchansky',
  'Presnensky',
  'Tagansky',
  'Tverskoy',
  'Khamovniki',
  'Yakimanka',
  'Arbat',
  'Sokolniki',
  'Maryina Roshcha',
];

export function getData() {
  return districts.map((district, index) => ({ district, permits: 96 - index * 6 + (index % 3) * 5 }));
}
