'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export default function Chip({
  active = false,
  className = '',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-border bg-white text-ink hover:border-ink/40'
      } ${className}`}
    >
      {children}
    </button>
  );
}
