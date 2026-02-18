import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isHoliday,
  isBusinessDay,
  addBusinessDays,
  calculateDeadline,
  calculateMonthDeadline,
  isOverdue,
  getDaysUntil,
  formatEventDate,
  formatShortDate,
  getRelativeTime,
  getUrgencyLevel,
  toISOString,
  parseDate,
  isFutureDate,
  isToday,
} from '@/lib/dates';

describe('isHoliday', () => {
  it('should identify federal holidays', () => {
    expect(isHoliday(new Date(2025, 0, 1))).toBe(true); // New Year's
    expect(isHoliday(new Date(2025, 6, 4))).toBe(true); // Independence Day
    expect(isHoliday(new Date(2025, 11, 25))).toBe(true); // Christmas
  });

  it('should return false for non-holidays', () => {
    expect(isHoliday(new Date(2025, 2, 15))).toBe(false);
    expect(isHoliday(new Date(2025, 7, 20))).toBe(false);
  });

  it('should identify state-specific holidays', () => {
    expect(isHoliday(new Date(2025, 2, 31), 'CA')).toBe(true); // Cesar Chavez Day
    expect(isHoliday(new Date(2025, 2, 2), 'TX')).toBe(true); // Texas Independence Day
  });

  it('should not match state holidays without state code', () => {
    expect(isHoliday(new Date(2025, 2, 31))).toBe(false); // CA only
  });
});

describe('isBusinessDay', () => {
  it('should return true for weekdays that are not holidays', () => {
    expect(isBusinessDay(new Date(2025, 2, 10))).toBe(true); // Monday Mar 10
    expect(isBusinessDay(new Date(2025, 2, 12))).toBe(true); // Wednesday Mar 12
    expect(isBusinessDay(new Date(2025, 2, 14))).toBe(true); // Friday Mar 14
  });

  it('should return false for weekends', () => {
    expect(isBusinessDay(new Date(2025, 2, 8))).toBe(false); // Saturday Mar 8
    expect(isBusinessDay(new Date(2025, 2, 9))).toBe(false); // Sunday Mar 9
  });

  it('should return false for holidays', () => {
    expect(isBusinessDay(new Date(2025, 0, 1))).toBe(false); // New Year's Jan 1
    expect(isBusinessDay(new Date(2025, 11, 25))).toBe(false); // Christmas Dec 25
  });
});

describe('addBusinessDays', () => {
  it('should skip weekends', () => {
    const friday = new Date(2025, 2, 7); // March 7, 2025 = Friday
    const result = addBusinessDays(friday, 1);
    expect(result.getDay()).toBe(1); // Should be Monday
  });

  it('should skip holidays', () => {
    // Dec 24, 2025 is Wednesday; Dec 25 is Thursday (holiday)
    const wed = new Date(2025, 11, 24); // Dec 24
    const result = addBusinessDays(wed, 1);
    // Should skip Dec 25 (Christmas) and land on Dec 26 (Friday)
    expect(result.getDate()).toBe(26);
  });

  it('should add multiple business days correctly', () => {
    const monday = new Date(2025, 2, 3); // March 3, 2025 = Monday
    const result = addBusinessDays(monday, 5);
    // 5 business days from Monday = next Monday
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(10);
  });
});

describe('calculateDeadline', () => {
  it('should add calendar days when not working days', () => {
    const result = calculateDeadline('2025-03-01', 10, false);
    expect(result.getDate()).toBe(11);
  });

  it('should add business days when working days flag is set', () => {
    const result = calculateDeadline(new Date(2025, 2, 3), 5, true); // Monday March 3
    expect(result.getDay()).toBe(1); // Should be following Monday
  });

  it('should accept Date objects', () => {
    const start = new Date(2025, 5, 1); // June 1 (month 0-indexed)
    const result = calculateDeadline(start, 30, false);
    expect(result.getMonth()).toBe(6); // July (0-indexed)
  });
});

describe('calculateMonthDeadline', () => {
  it('should add months correctly', () => {
    const result = calculateMonthDeadline('2025-01-15', 6);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(15);
  });

  it('should handle year boundaries', () => {
    const result = calculateMonthDeadline('2025-11-01', 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
  });
});

describe('isOverdue', () => {
  it('should return true for past dates with upcoming status', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    expect(isOverdue(pastDate, 'upcoming')).toBe(true);
  });

  it('should return false for future dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    expect(isOverdue(futureDate, 'upcoming')).toBe(false);
  });

  it('should return false for non-upcoming status', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    expect(isOverdue(pastDate, 'completed')).toBe(false);
    expect(isOverdue(pastDate, 'waived')).toBe(false);
  });
});

describe('getDaysUntil', () => {
  it('should return positive for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const result = getDaysUntil(future);
    expect(result).toBe(5);
  });

  it('should return negative for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const result = getDaysUntil(past);
    expect(result).toBe(-5);
  });

  it('should return 0 for today', () => {
    const today = new Date();
    expect(getDaysUntil(today)).toBe(0);
  });
});

describe('formatEventDate', () => {
  it('should format all-day events', () => {
    const result = formatEventDate('2025-03-15', true);
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('should format timed events', () => {
    const result = formatEventDate('2025-03-15T14:30:00', false);
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });
});

describe('formatShortDate', () => {
  it('should format dates in short form', () => {
    expect(formatShortDate('2025-03-15')).toBe('Mar 15, 2025');
  });

  it('should accept Date objects', () => {
    // Use ISO date with explicit time to avoid timezone shift
    const result = formatShortDate(new Date(2025, 11, 25)); // month is 0-indexed
    expect(result).toBe('Dec 25, 2025');
  });
});

describe('getRelativeTime', () => {
  function daysFromNow(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  it('should return "Today" for today', () => {
    expect(getRelativeTime(new Date())).toBe('Today');
  });

  it('should return "Tomorrow" for tomorrow', () => {
    expect(getRelativeTime(daysFromNow(1))).toBe('Tomorrow');
  });

  it('should return "Yesterday" for yesterday', () => {
    expect(getRelativeTime(daysFromNow(-1))).toBe('Yesterday');
  });

  it('should return "in X days" for near future', () => {
    expect(getRelativeTime(daysFromNow(3))).toBe('in 3 days');
  });

  it('should return "X days ago" for recent past', () => {
    expect(getRelativeTime(daysFromNow(-3))).toBe('3 days ago');
  });
});

describe('getUrgencyLevel', () => {
  function daysFromNow(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  it('should return "overdue" for past deadlines', () => {
    expect(getUrgencyLevel(daysFromNow(-5), 'upcoming')).toBe('overdue');
  });

  it('should return "urgent" for deadlines within 3 days', () => {
    expect(getUrgencyLevel(daysFromNow(2), 'upcoming')).toBe('urgent');
  });

  it('should return "soon" for deadlines within 14 days', () => {
    expect(getUrgencyLevel(daysFromNow(10), 'upcoming')).toBe('soon');
  });

  it('should return "normal" for deadlines beyond 14 days', () => {
    expect(getUrgencyLevel(daysFromNow(30), 'upcoming')).toBe('normal');
  });

  it('should return "normal" for non-upcoming statuses', () => {
    expect(getUrgencyLevel(daysFromNow(-5), 'completed')).toBe('normal');
  });
});

describe('toISOString', () => {
  it('should return ISO string', () => {
    const date = new Date('2025-03-15T12:00:00Z');
    expect(toISOString(date)).toBe('2025-03-15T12:00:00.000Z');
  });
});

describe('parseDate', () => {
  it('should parse string dates', () => {
    const result = parseDate('2025-03-15');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2025);
  });

  it('should pass through Date objects', () => {
    const date = new Date(2025, 2, 15);
    expect(parseDate(date)).toBe(date);
  });
});

describe('isFutureDate', () => {
  it('should return true for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(isFutureDate(future)).toBe(true);
  });

  it('should return false for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(isFutureDate(past)).toBe(false);
  });

  it('should return false for today', () => {
    expect(isFutureDate(new Date())).toBe(false);
  });
});

describe('isToday', () => {
  it('should return true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('should return false for other dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });
});
