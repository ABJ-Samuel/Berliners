import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export default function Input({ label, hint, className = '', id, ...rest }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input id={id} {...rest} className={`field ${className}`} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
