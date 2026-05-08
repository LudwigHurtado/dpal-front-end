import React from 'react';
import { Link } from 'react-router-dom';

interface RouteBreadcrumbHeaderProps {
  title: string;
  subtitle?: string;
  currentPageLabel: string;
}

export default function RouteBreadcrumbHeader({
  title,
  subtitle,
  currentPageLabel,
}: RouteBreadcrumbHeaderProps): React.ReactElement {
  return (
    <header className="space-y-2">
      <p className="text-[11px] dpal-text-muted">
        <Link to="/water-intelligence" className="hover:underline">
          Water Intelligence home
        </Link>{' '}
        <span className="px-1">→</span>
        <Link to="/water-intelligence/colorado-river" className="hover:underline">
          Colorado River Exchange
        </Link>{' '}
        <span className="px-1">→</span>
        <span style={{ color: 'var(--dpal-text-secondary)' }}>{currentPageLabel}</span>
      </p>
      <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        {title}
      </h1>
      {subtitle && <p className="text-[11px] dpal-text-secondary max-w-4xl">{subtitle}</p>}
    </header>
  );
}
