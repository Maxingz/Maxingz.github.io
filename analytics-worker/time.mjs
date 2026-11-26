export const pacificZone = 'America/Los_Angeles';
export function pacificDay(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: pacificZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function pacificTime(value) {
  if (!value) return 'Not recorded yet';
  return new Intl.DateTimeFormat('en-US', { timeZone: pacificZone, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}
