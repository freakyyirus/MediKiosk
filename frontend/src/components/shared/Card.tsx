import React from 'react';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  hover?: boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
}: CardProps) {
  return (
    <div
      className={`card ${paddingStyles[padding]} ${hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
