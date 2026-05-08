import React from 'react';

export default function Club20SectionCard({
  title,
  body,
  editableHint = 'Preview — edit in a future release',
}: {
  title: string;
  body: string;
  editableHint?: string;
}): React.ReactElement {
  return (
    <article className="rounded-2xl p-4 border dpal-border-subtle space-y-2" style={{ background: 'var(--dpal-card)' }}>
      <div className="flex justify-between items-baseline gap-2 flex-wrap">
        <h3 className="text-sm font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
          {title}
        </h3>
        <span className="text-[9px] font-bold uppercase dpal-text-muted">{editableHint}</span>
      </div>
      <p className="text-xs dpal-text-secondary leading-relaxed whitespace-pre-wrap">{body}</p>
    </article>
  );
}
