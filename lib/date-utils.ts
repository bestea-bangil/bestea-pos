export function getJakartaDate(): Date {
  // Returns a Date object representing current time in Jakarta
  // Note: The Date object itself is still technically UTC timestamps, 
  // but if we use methods like getFullYear(), etc., on the client/system locale it might differ.
  // Ideally we use this to get a "time-shifted" date object where .getHours() returns Jakarta hours
  // OR we just use it to generate strings. 
  // A safer way for "server-side calculations" involving hours:
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jakartaOffset = 7 * 3600000;
  return new Date(utc + jakartaOffset);
}

export function getJakartaYYYYMMDD(date?: Date): string {
  const d = date || new Date();
  // Safe way to get YYYY-MM-DD in Jakarta timezone
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  return formatter.format(d);
}

export function getJakartaTime(date?: Date): string {
    const d = date || new Date();
    // Safe way to get HH:mm:ss in Jakarta timezone
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    return formatter.format(d);
}
