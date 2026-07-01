export function getData() {
  return [
    { task: 'extract', start: 0, end: 3, status: 'done' },
    { task: 'validate', start: 3, end: 5, status: 'done' },
    { task: 'transform', start: 5, end: 11, status: 'running' },
    { task: 'notify', start: 8, end: 10, status: 'failed' },
    { task: 'load', start: 11, end: 14, status: 'queued' },
    { task: 'report', start: 14, end: 16, status: 'queued' },
  ];
}
