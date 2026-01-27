/**
 * React-specific utility types
 */

// Component prop utilities
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;
export type ElementProps<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T];

// Component composition utilities
export type WithChildren<T = {}> = T & { children?: React.ReactNode };
export type WithClassName<T = {}> = T & { className?: string };

// Event handler utilities
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;
export type KeyboardHandler<T = HTMLElement> = (event: React.KeyboardEvent<T>) => void;

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

// Re-export common React types
export type {
  ChangeEvent,
  MouseEvent,
  KeyboardEvent,
  FormEvent,
  FocusEvent,
} from 'react';
