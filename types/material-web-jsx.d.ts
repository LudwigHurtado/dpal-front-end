/**
 * JSX typings for Material Web custom elements used in React.
 * @see https://github.com/material-components/material-web/tree/main/docs
 */
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'md-outlined-text-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          label?: string;
          value?: string;
          type?: string;
          rows?: string;
          supportingText?: string;
          error?: boolean;
          errorText?: string;
          required?: boolean;
        },
        HTMLElement
      >;
      'md-filled-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          disabled?: boolean;
          type?: 'button' | 'submit' | 'reset';
        },
        HTMLElement
      >;
      'md-outlined-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          disabled?: boolean;
          type?: 'button' | 'submit' | 'reset';
        },
        HTMLElement
      >;
      'md-outlined-select': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          label?: string;
          value?: string;
          required?: boolean;
          menuPositioning?: 'absolute' | 'fixed' | 'popover';
        },
        HTMLElement
      >;
      'md-select-option': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          value?: string;
          headline?: string;
          selected?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

export {};
