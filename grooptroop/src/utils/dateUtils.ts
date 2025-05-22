// Get the start of a day (midnight)
export function startOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

// Format a date for display in messages
export function formatMessageDate(date: Date): string {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDay = startOfDay(date);
  
  // Today
  if (messageDay.getTime() === today.getTime()) {
    return 'Today';
  }
  
  // Yesterday
  if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // Within the last 7 days
  const daysDiff = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
  
  // This year
  if (now.getFullYear() === date.getFullYear()) {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
  
  // Different year
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Format a time for display in messages
export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  });
}