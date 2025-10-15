declare module '../utils/logger' {
  export const logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug?: (...args: any[]) => void;
    trace?: (...args: any[]) => void;
  };
}

declare module '@shared/utils/logger' {
  export const logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug?: (...args: any[]) => void;
    trace?: (...args: any[]) => void;
  };
}
