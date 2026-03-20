/**
 * React-specific utility types
 * 
 * Note: madge reports a false positive circular dependency for this file.
 * This is a known issue with madge and TypeScript type re-exports.
 * The file has no actual circular dependencies - verified by TypeScript compiler.
 * See: https://github.com/pahen/madge/issues/306
 */

import type {
  ChangeEvent as ReactChangeEvent,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
  FormEvent as ReactFormEvent,
  FocusEvent as ReactFocusEvent,
} from 'react';

// Component prop utilities
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;
export type ElementProps<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T];

// Component composition utilities
export type WithChildren<T = {}> = T & { children?: React.ReactNode };
export type WithClassName<T = {}> = T & { className?: string };

// Event handler utilities
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: ReactChangeEvent<T>) => void;
export type ClickHandler<T = HTMLElement> = (event: ReactMouseEvent<T>) => void;
export type SubmitHandler = (event: ReactFormEvent<HTMLFormElement>) => void;
export type KeyboardHandler<T = HTMLElement> = (event: ReactKeyboardEvent<T>) => void;

// State utilities
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
export type StateUpdater<T> = (prevState: T) => T;
export type UseState<T> = [T, SetState<T>];

// Error boundary utilities
export type ErrorInfo = {
  componentStack: string;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
};

// Re-export React event types with original names
export type ChangeEvent<T = Element> = ReactChangeEvent<T>;
export type MouseEvent<T = Element> = ReactMouseEvent<T>;
export type KeyboardEvent<T = Element> = ReactKeyboardEvent<T>;
export type FormEvent<T = Element> = ReactFormEvent<T>;
export type FocusEvent<T = Element> = ReactFocusEvent<T>;
