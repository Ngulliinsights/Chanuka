declare global {
  var testUtils: {
    createTempFile: (content: string, extension?: string) => Promise<{
      tempFile: string;
      tempDir: string;
      cleanup: () => Promise<void>;
    }>;
    createTempProject: (files: { [filename: string]: string }) => Promise<{
      tempDir: string;
      cleanup: () => Promise<void>;
    }>;
  };
}

export {};