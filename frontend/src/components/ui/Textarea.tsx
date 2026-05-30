import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
}

export default function Textarea({
  label,
  hint,
  rightSlot,
  className = '',
  id,
  ...rest
}: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {(label || rightSlot) && (
        <div className="flex items-center justify-between">
          {label ? (
            <label htmlFor={id} className="label">
              {label}
            </label>
          ) : (
            <span />
          )}
          {rightSlot}
        </div>
      )}
      <textarea id={id} {...rest} className={`field min-h-[88px] resize-y ${className}`} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
