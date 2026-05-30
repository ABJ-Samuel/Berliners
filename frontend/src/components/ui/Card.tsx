import type { ReactNode } from 'react';

export default function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl2 border border-border bg-white p-6 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
