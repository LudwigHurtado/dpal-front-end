/**
 * Material Web form controls for Politician Transparency evidence workspace.
 * Registers components and provides React-friendly sync for Lit-controlled value props.
 */
import React, { useEffect, useRef } from 'react';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

export function MdOutlinedTextFieldSync({
  label,
  value,
  onValueChange,
  type = 'text',
  rows = 5,
  supportingText,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  type?: 'text' | 'url' | 'textarea';
  rows?: number;
  supportingText?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement & { value: string } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  return (
    <md-outlined-text-field
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      label={label}
      type={type}
      {...(supportingText ? { supportingText } : {})}
      {...(type === 'textarea' ? { rows: String(rows) } : {})}
      onInput={(e: React.FormEvent<HTMLElement & { value: string }>) => {
        onValueChange(e.currentTarget.value);
      }}
    />
  );
}

export function MdOutlinedSelectSync({
  label,
  value,
  onValueChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: readonly string[];
  className?: string;
}) {
  const ref = useRef<HTMLElement & { value: string } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  return (
    <md-outlined-select
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      label={label}
      menuPositioning="fixed"
      onChange={(e: React.FormEvent<HTMLElement & { value: string }>) => {
        onValueChange(e.currentTarget.value);
      }}
    >
      {options.map((opt) => (
        <md-select-option key={opt} value={opt} headline={opt} />
      ))}
    </md-outlined-select>
  );
}
