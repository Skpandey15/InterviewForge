import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import type { SelectOption } from '../types';

interface FieldShellProps {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, htmlFor, children }: FieldShellProps) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: IconName;
  error?: string;
  hint?: string;
}

export function TextField({ label, icon, error, hint, id, className = '', ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={inputId}>
      <div className={`field__control ${className}`}>
        {icon && (
          <span className="field__icon">
            <Icon name={icon} size={17} />
          </span>
        )}
        <input
          id={inputId}
          className="field__input"
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type'> {}

export function PasswordField({ label, error, hint, id, ...rest }: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={inputId}>
      <div className="field__control">
        <span className="field__icon">
          <Icon name="lock" size={17} />
        </span>
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className="field__input"
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <button
          type="button"
          className="field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={17} />
        </button>
      </div>
    </FieldShell>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export function SelectField({ label, options, error, id, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} htmlFor={selectId}>
      <div className="field__control field__control--select">
        <select id={selectId} className="field__input field__select" {...rest}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="field__chevron">
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
    </FieldShell>
  );
}

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export function Checkbox({ label, id, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className="checkbox" htmlFor={inputId}>
      <input id={inputId} type="checkbox" {...rest} />
      <span className="checkbox__box" aria-hidden="true">
        <Icon name="check" size={12} strokeWidth={3} />
      </span>
      <span className="checkbox__label">{label}</span>
    </label>
  );
}

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export function Radio({ label, id, ...rest }: RadioProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className="radio" htmlFor={inputId}>
      <input id={inputId} type="radio" {...rest} />
      <span className="radio__dot" aria-hidden="true" />
      <span className="radio__label">{label}</span>
    </label>
  );
}
