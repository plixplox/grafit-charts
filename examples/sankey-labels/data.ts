export function getData() {
  return [
    { from: 'Salary', to: 'Budget', amount: 220 },
    { from: 'Freelance', to: 'Budget', amount: 60 },
    { from: 'Budget', to: 'Rent', amount: 90 },
    { from: 'Budget', to: 'Food', amount: 70 },
    { from: 'Budget', to: 'Transport', amount: 30 },
    { from: 'Budget', to: 'Savings', amount: 90 },
    { from: 'Savings', to: 'Investments', amount: 60 },
    { from: 'Savings', to: 'Emergency fund', amount: 30 },
  ];
}
