import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  email?: boolean | string;
  url?: boolean | string;
  match?: { field: string; message: string };
  custom?: (value: unknown, formData: Record<string, unknown>) => string | undefined;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface FieldError {
  message: string;
  touched: boolean;
}

export interface FormErrors {
  [fieldName: string]: FieldError;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((
    fieldName: string,
    value: unknown,
    formData: Record<string, unknown>
  ): string | undefined => {
    const rule = rules[fieldName];
    if (!rule) return undefined;

    // Required validation
    if (rule.required) {
      const isEmpty = value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        return typeof rule.required === 'string' 
          ? rule.required 
          : 'Trường này là bắt buộc';
      }
    }

    // Skip other validations if empty and not required
    if (!value && !rule.required) return undefined;

    // MinLength validation
    if (rule.minLength && typeof value === 'string') {
      const minLen = typeof rule.minLength === 'number' 
        ? rule.minLength 
        : rule.minLength.value;
      if (value.length < minLen) {
        return typeof rule.minLength === 'object'
          ? rule.minLength.message
          : `Tối thiểu ${minLen} ký tự`;
      }
    }

    // MaxLength validation
    if (rule.maxLength && typeof value === 'string') {
      const maxLen = typeof rule.maxLength === 'number'
        ? rule.maxLength
        : rule.maxLength.value;
      if (value.length > maxLen) {
        return typeof rule.maxLength === 'object'
          ? rule.maxLength.message
          : `Tối đa ${maxLen} ký tự`;
      }
    }

    // Min value validation
    if (rule.min !== undefined) {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      const minVal = typeof rule.min === 'number' ? rule.min : rule.min.value;
      if (!isNaN(numValue) && numValue < minVal) {
        return typeof rule.min === 'object'
          ? rule.min.message
          : `Giá trị tối thiểu là ${minVal}`;
      }
    }

    // Max value validation
    if (rule.max !== undefined) {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      const maxVal = typeof rule.max === 'number' ? rule.max : rule.max.value;
      if (!isNaN(numValue) && numValue > maxVal) {
        return typeof rule.max === 'object'
          ? rule.max.message
          : `Giá trị tối đa là ${maxVal}`;
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.value.test(value)) {
        return rule.pattern.message;
      }
    }

    // Email validation
    if (rule.email && typeof value === 'string') {
      if (!EMAIL_REGEX.test(value)) {
        return typeof rule.email === 'string'
          ? rule.email
          : 'Email không hợp lệ';
      }
    }

    // URL validation
    if (rule.url && typeof value === 'string') {
      if (!URL_REGEX.test(value)) {
        return typeof rule.url === 'string'
          ? rule.url
          : 'URL không hợp lệ';
      }
    }

    // Match validation (for password confirmation)
    if (rule.match) {
      const matchValue = formData[rule.match.field];
      if (value !== matchValue) {
        return rule.match.message;
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value, formData);
    }

    return undefined;
  }, [rules]);

  const validate = useCallback((
    fieldName: string,
    value: unknown,
    formData: Record<string, unknown>
  ): boolean => {
    const error = validateField(fieldName, value, formData);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: {
        message: error || '',
        touched: touched[fieldName] || false
      }
    }));

    return !error;
  }, [validateField, touched]);

  const validateAll = useCallback((formData: Record<string, unknown>): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName], formData);
      newErrors[fieldName] = {
        message: error || '',
        touched: true
      };
      if (error) isValid = false;
    });

    setErrors(newErrors);
    setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    return isValid;
  }, [rules, validateField]);

  const setFieldTouched = useCallback((fieldName: string, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));
    setErrors(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched: isTouched
      }
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    setTouched(prev => {
      const newTouched = { ...prev };
      delete newTouched[fieldName];
      return newTouched;
    });
  }, []);

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    const error = errors[fieldName];
    return error && error.touched ? error.message : undefined;
  }, [errors]);

  const hasError = useCallback((fieldName: string): boolean => {
    const error = errors[fieldName];
    return !!(error && error.touched && error.message);
  }, [errors]);

  return {
    errors,
    validate,
    validateAll,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasError
  };
};
