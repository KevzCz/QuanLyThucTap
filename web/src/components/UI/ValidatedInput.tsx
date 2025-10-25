import React from 'react';

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
  inputClassName?: string;
  icon?: React.ReactNode;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName = '',
  inputClassName = '',
  icon,
  ...inputProps
}) => {
  const hasError = touched && error;
  
  const baseInputClass = `w-full h-11 rounded-lg border px-3 focus:outline-none focus:ring-2 transition ${
    icon ? 'pl-10' : ''
  } ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
  } ${inputProps.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {icon}
          </span>
        )}
        <input
          {...inputProps}
          className={`${baseInputClass} ${inputClassName}`}
        />
      </div>

      {helpText && !hasError && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
      
      {hasError && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
  textareaClassName?: string;
  showCharCount?: boolean;
  maxLength?: number;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName = '',
  textareaClassName = '',
  showCharCount,
  maxLength,
  value,
  ...textareaProps
}) => {
  const hasError = touched && error;
  const charCount = typeof value === 'string' ? value.length : 0;
  
  const baseTextareaClass = `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
  } ${textareaProps.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`;

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between mb-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {showCharCount && maxLength && (
          <span className={`text-xs ${charCount > maxLength ? 'text-red-600' : 'text-gray-500'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
      
      <textarea
        {...textareaProps}
        value={value}
        maxLength={maxLength}
        className={`${baseTextareaClass} ${textareaClassName}`}
      />

      {helpText && !hasError && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
      
      {hasError && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

interface ValidatedSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
  selectClassName?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName = '',
  selectClassName = '',
  options,
  ...selectProps
}) => {
  const hasError = touched && error;
  
  const baseSelectClass = `w-full h-11 rounded-lg border px-3 focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
  } ${selectProps.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        {...selectProps}
        className={`${baseSelectClass} ${selectClassName}`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helpText && !hasError && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
      
      {hasError && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
