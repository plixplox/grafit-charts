const YEARS = ['2019', '2020', '2021'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Revenue per year split across the months it landed in. */
export function getData() {
  return YEARS.flatMap((year, yearIndex) =>
    MONTHS.map((month, monthIndex) => ({
      year,
      month,
      revenue: 40 + ((yearIndex * 7 + monthIndex * 5) % 55),
    })),
  );
}
