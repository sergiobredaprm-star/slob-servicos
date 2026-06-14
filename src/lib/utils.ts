import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(value: string) {
  if (!value) return ""
  value = value.replace(/\D/g,'')
  value = value.replace(/(\d{2})(\d)/,"($1) $2")
  value = value.replace(/(\d)(\d{4})$/,"$1-$2")
  return value
}

export function formatCpf(value: string) {
  if (!value) return ""
  value = value.replace(/\D/g,'')
  value = value.replace(/(\d{3})(\d)/,"$1.$2")
  value = value.replace(/(\d{3})(\d)/,"$1.$2")
  value = value.replace(/(\d{3})(\d{1,2})$/,"$1-$2")
  return value
}

export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object') {
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (dateValue.seconds !== undefined) {
      return new Date(dateValue.seconds * 1000);
    }
  }
  const dateObj = new Date(dateValue);
  return isNaN(dateObj.getTime()) ? null : dateObj;
}

