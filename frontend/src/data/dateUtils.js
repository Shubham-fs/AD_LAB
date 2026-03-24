// Minimal date utilities (avoids date-fns dependency)
export function subDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
export function format(date, pattern = 'yyyy-MM-dd') {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (pattern === 'MMM dd') {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${day}`;
  }
  return `${y}-${m}-${day}`;
}
