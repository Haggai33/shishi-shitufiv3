export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
}

export function formatTime(timeStr: string): string {
  try {
    return timeStr;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeStr;
  }
}

export function isEventPast(dateStr: string, timeStr: string): boolean {
  try {
    // בדיקה אם התאריך עבר (לא כולל את היום הנוכחי)
    const eventDate = new Date(dateStr);
    const now = new Date();
    
    // השוואה רק לפי תאריך, לא לפי שעה
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const isPast = eventDateOnly < nowDateOnly;
    
    console.log('Event date comparison:', {
      eventDate: eventDateOnly.toDateString(),
      nowDate: nowDateOnly.toDateString(),
      isPast,
      originalEventDate: dateStr,
      originalEventTime: timeStr
    });
    
    return isPast;
  } catch (error) {
    console.error('Error checking if event is past:', error);
    return false;
  }
}

export function getNextFriday(): string {
  const today = new Date();
  const nextFriday = new Date(today);
  
  // Find next Friday (day 5 in JavaScript, where Sunday is 0)
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  
  return nextFriday.toISOString().split('T')[0];
}
// פונקציה נוספת לבדיקה אם האירוע הסתיים (כולל שעה)
export function isEventFinished(dateStr: string, timeStr: string): boolean {
  try {
    const eventDateTime = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    return eventDateTime < now;
  } catch (error) {
    console.error('Error checking if event is finished:', error);
    return false;
  }
}