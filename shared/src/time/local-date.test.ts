import { describe, expect, it } from 'vitest';
import {
  addDays,
  computeLocalDate,
  isLocalDate,
  isoWeekday,
  timeOfDayToMinutes,
  tzOffsetMinutes,
} from './local-date.ts';

describe('computeLocalDate', () => {
  it('uses the device offset, not UTC', () => {
    // 23:30 UTC on 1 Jan = 00:30 on 2 Jan in Berlin (UTC+1)
    expect(computeLocalDate({ instant: '2026-01-01T23:30:00Z', tzOffsetMin: 60 })).toBe(
      '2026-01-02',
    );
    expect(computeLocalDate({ instant: '2026-01-01T23:30:00Z', tzOffsetMin: 0 })).toBe(
      '2026-01-01',
    );
  });

  it('handles summer time offsets (CEST, UTC+2)', () => {
    // 22:30 UTC on 30 Jun = 00:30 on 1 Jul in Berlin summer time
    expect(computeLocalDate({ instant: '2026-06-30T22:30:00Z', tzOffsetMin: 120 })).toBe(
      '2026-07-01',
    );
  });

  it('is correct around the DST switch night', () => {
    // 29 Mar 2026: Berlin clocks jump 02:00 → 03:00. 00:30 UTC is still 01:30 CET.
    expect(computeLocalDate({ instant: '2026-03-29T00:30:00Z', tzOffsetMin: 60 })).toBe(
      '2026-03-29',
    );
    // After the switch: 23:30 UTC with +120 = 01:30 next day
    expect(computeLocalDate({ instant: '2026-03-29T23:30:00Z', tzOffsetMin: 120 })).toBe(
      '2026-03-30',
    );
  });

  it('respects a custom day start', () => {
    // 01:30 local with day start 04:00 belongs to the previous day
    expect(
      computeLocalDate({ instant: '2026-01-02T00:30:00Z', tzOffsetMin: 60, dayStart: '04:00' }),
    ).toBe('2026-01-01');
    // 04:00 local exactly starts the new day
    expect(
      computeLocalDate({ instant: '2026-01-02T03:00:00Z', tzOffsetMin: 60, dayStart: '04:00' }),
    ).toBe('2026-01-02');
  });

  it('assigns sleep across midnight to the wake-up day when given the end time', () => {
    const wakeUp = '2026-01-02T06:15:00Z';
    expect(computeLocalDate({ instant: wakeUp, tzOffsetMin: 60 })).toBe('2026-01-02');
  });

  it('accepts negative offsets', () => {
    expect(computeLocalDate({ instant: '2026-01-02T03:00:00Z', tzOffsetMin: -300 })).toBe(
      '2026-01-01',
    );
  });

  it('rejects invalid input', () => {
    expect(() => computeLocalDate({ instant: 'nope', tzOffsetMin: 0 })).toThrow(RangeError);
    expect(() => computeLocalDate({ instant: new Date(), tzOffsetMin: 2000 })).toThrow(RangeError);
    expect(() =>
      computeLocalDate({ instant: new Date(), tzOffsetMin: 0, dayStart: '25:00' }),
    ).toThrow(RangeError);
  });
});

describe('date helpers', () => {
  it('validates local dates strictly', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-2-3')).toBe(false);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes ISO weekdays', () => {
    expect(isoWeekday('2026-11-23')).toBe(1); // Monday
    expect(isoWeekday('2026-11-29')).toBe(7); // Sunday
  });

  it('parses times of day', () => {
    expect(timeOfDayToMinutes('04:30')).toBe(270);
  });

  it('returns offsets east of UTC without negative zero', () => {
    expect(Object.is(tzOffsetMinutes(new Date()), -0)).toBe(false);
  });
});
