import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'md' | 'lg' | 'none';
  children: ReactNode;
}

export function Card({ padding = 'md', className = '', children, ...rest }: CardProps) {
  return (
    <div className={`card card--pad-${padding} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export interface BadgeProps {
  tone?: 'success' | 'warning' | 'info' | 'neutral';
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
