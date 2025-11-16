declare global {
  interface Window {
    DD_RUM?: {
      setUser: (user: { id: string; [key: string]: any }) => void;
      addAction: (name: string, properties?: Record<string, any>) => void;
    };
  }
}

export {};