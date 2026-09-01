/**
 * Strict Input Validation Utilities for KoraNews Backend
 * Enforces zero type coercion loopholes, strict integer bounds, and rejection of malformed payloads.
 */

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
}

/**
 * Validates non-negative scores (0 to maxScore, default 30).
 * Strictly rejects: "2abc", "2.5", "-1", "", null, undefined, NaN, Infinity, objects, booleans.
 */
export function validateScore(val: any, fieldName = 'النتيجة', maxScore = 30): ValidationResult<number> {
  if (val === null || val === undefined || typeof val === 'boolean') {
    return { valid: false, error: `${fieldName} مطلوب ولا يمكن أن يكون فارغاً` };
  }

  const str = String(val).trim();
  if (str === '' || !/^\d+$/.test(str)) {
    return { valid: false, error: `${fieldName} يجب أن يكون رقماً صحيحاً غير سالب (مثل: 0, 1, 2)` };
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num) || isNaN(num) || !isFinite(num)) {
    return { valid: false, error: `${fieldName} يحتوي على قيمة رقمية غير صالحة` };
  }

  if (num < 0 || num > maxScore) {
    return { valid: false, error: `${fieldName} يجب أن يكون بين 0 و ${maxScore}` };
  }

  return { valid: true, value: num };
}

/**
 * Validates positive points per match (1 to maxPoints, default 20).
 * Strictly rejects: 0, "2.5", "2abc", "-1", "", null, undefined, NaN.
 */
export function validatePointsPerMatch(val: any, fieldName = 'النقاط', minPoints = 1, maxPoints = 20): ValidationResult<number> {
  if (val === null || val === undefined || typeof val === 'boolean') {
    return { valid: false, error: `${fieldName} مطلوبة` };
  }

  const str = String(val).trim();
  if (str === '' || !/^[1-9]\d*$/.test(str)) {
    return { valid: false, error: `${fieldName} يجب أن تكون رقماً صحيحاً موجباً (أكبر من 0)` };
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num) || isNaN(num) || !isFinite(num)) {
    return { valid: false, error: `${fieldName} غير صالحة` };
  }

  if (num < minPoints || num > maxPoints) {
    return { valid: false, error: `${fieldName} يجب أن تكون بين ${minPoints} و ${maxPoints}` };
  }

  return { valid: true, value: num };
}

/**
 * Validates integer ID parameter.
 * Strictly rejects: "1abc", "1.5", "-1", "0", null, undefined.
 */
export function validatePositiveId(val: any, fieldName = 'المعرف'): ValidationResult<number> {
  if (val === null || val === undefined || typeof val === 'boolean') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }

  const str = String(val).trim();
  if (str === '' || !/^[1-9]\d*$/.test(str)) {
    return { valid: false, error: `${fieldName} غير صالح، يجب أن يكون معرّفاً رقمياً صحيحاً` };
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num) || isNaN(num) || !isFinite(num) || num <= 0) {
    return { valid: false, error: `${fieldName} غير صالح` };
  }

  return { valid: true, value: num };
}
