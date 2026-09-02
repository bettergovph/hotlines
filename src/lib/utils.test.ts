import { describe, expect, it } from 'vitest';
import { formatPhoneNumber } from './utils';
import hotlinesData from '../../public/data/hotlines.json';

describe('formatPhoneNumber', () => {
  it('formats mobile numbers as 09XX XXX XXXX', () => {
    expect(formatPhoneNumber('09363309020')).toBe('0936 330 9020');
    expect(formatPhoneNumber('09171234567')).toBe('0917 123 4567');
  });

  it('formats Metro Manila landlines as (02) XXXX XXXX', () => {
    expect(formatPhoneNumber('0281234567')).toBe('(02) 8123 4567');
    expect(formatPhoneNumber('0287654321')).toBe('(02) 8765 4321');
  });

  it('formats provincial landlines as (0XX) XXX XXXX', () => {
    expect(formatPhoneNumber('0447924300')).toBe('(044) 792 4300');
    expect(formatPhoneNumber('0446401266')).toBe('(044) 640 1266');
    expect(formatPhoneNumber('0443092956')).toBe('(044) 309 2956');
  });

  it('formats Metro Manila 8-digit local numbers as XXXX XXXX', () => {
    expect(formatPhoneNumber('85322145')).toBe('8532 2145');
    expect(formatPhoneNumber('88701000')).toBe('8870 1000');
  });

  it('returns the original string for unrecognized formats', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
    expect(formatPhoneNumber('')).toBe('');
  });
});

describe('formatPhoneNumber with real hotlines data', () => {
  const allNumbers = (hotlinesData.hotlines ?? [])
    .flatMap(h => [h.hotlineNumber, ...h.alternateNumbers])
    .filter(Boolean);

  function assertFormat(predicate: (d: string) => boolean, regex: RegExp) {
    const numbers = allNumbers.filter(n => predicate(n.replace(/\D/g, '')));
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) {
      expect(formatPhoneNumber(n)).toMatch(regex);
    }
  }

  it('formats all mobile numbers (11 digits starting with 09) as 09XX XXX XXXX', () => {
    assertFormat(d => d.length === 11 && d.startsWith('09'), /^09\d{2} \d{3} \d{4}$/);
  });

  it('formats all Metro Manila landlines (10 digits starting with 02) as (02) XXXX XXXX', () => {
    assertFormat(d => d.length === 10 && d.startsWith('02'), /^\(02\) \d{4} \d{4}$/);
  });

  it('formats all provincial landlines (10 digits starting with 0, not 02) as (0XX) XXX XXXX', () => {
    assertFormat(
      d => d.length === 10 && d.startsWith('0') && !d.startsWith('02'),
      /^\(0\d{2}\) \d{3} \d{4}$/
    );
  });

  it('formats all Metro Manila 8-digit local numbers as XXXX XXXX', () => {
    assertFormat(d => d.length === 8, /^\d{4} \d{4}$/);
  });

  it('returns unrecognized numbers unchanged', () => {
    const unrecognized = allNumbers.filter(n => {
      const d = n.replace(/\D/g, '');
      return !(
        (d.length === 11 && d.startsWith('09')) ||
        (d.length === 10 && d.startsWith('0')) ||
        d.length === 8
      );
    });
    expect(unrecognized.length).toBeGreaterThan(0);
    for (const number of unrecognized) {
      expect(formatPhoneNumber(number)).toBe(number);
    }
  });
});
