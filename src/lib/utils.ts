import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(number: string): string {
  const digits = number.replace(/\D/g, '');

  // Mobile: 11 digits starting with 09 → 09XX XXX XXXX
  if (digits.length === 11 && digits.startsWith('09')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Metro Manila landline: 10 digits starting with 02 → (02) XXXX XXXX
  if (digits.length === 10 && digits.startsWith('02')) {
    return `(02) ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  // Provincial landline: 10 digits, 3-digit area code → (0XX) XXX XXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Metro Manila 8-digit local (no area code) → XXXX XXXX
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }

  return number;
}
