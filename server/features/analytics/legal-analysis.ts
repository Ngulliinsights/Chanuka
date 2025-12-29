import { AnalysisResult } from '@shared/analysis/types/index.js';
import { logger  } from '@shared/core';
import { spawn } from 'child_process';
import path from 'path';

// Configuration interface for better extensibility
interface AnalysisConfig {
  timeout?: number;
  maxRetries?: number;
  pythonExecutable?: string;
}

export class LegalAnalysisService {
  private readonly pythonScriptPath: string;
  private readonly config: Required<AnalysisConfig>;

  constructor(config: AnalysisConfig = {}) {
    this.pythonScriptPath = path.join(__dirname, '../../../ml/legal_analysis.py');

    // Provide sensible defaults while allowing customization
    this.config = {
      timeout: config.timeout ?? 30000, // 30 seconds default
      maxRetries: config.maxRetries ?? 2,
      pythonExecutable: config.pythonExecutable ?? 'python'
    };
  }

  /**
   * Analyzes legal document text using the Python ML model
   * @param text The legal document text to analyze
   * @returns Promise resolving to the analysis results
   */
  async analyzeDocument(text: string): Promise<AnalysisResult> {
    // Input validation to catch issues early
    if (!text || text.trim().length === 0) {
      throw new Error('Document text cannot be empty');
    }

    let lastError: Error | null = null;

    // Implement retry logic for resilience
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executePythonAnalysis(text);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain types of errors (like validation errors)
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        // Log the attempt for debugging purposes
        if (attempt < this.config.maxRetries) {
          console.warn(`Analysis attempt ${attempt + 1} failed, retrying...`, error);
          // Brief delay before retry to handle transient issues
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw new Error(
      `Failed to analyze document after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Core method that handles the actual Python process execution
   * Separated for better testability and error handling
   */
  private async executePythonAnalysis(text: string): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      // Create timeout handler to prevent hanging processes
      const timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Analysis timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      const pythonProcess = spawn(this.config.pythonExecutable, [this.pythonScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        // Detached process to better handle cleanup
        detached: false
      });

      // Handle process creation errors immediately
      pythonProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });

      // Collect output with better memory management
      const outputChunks: Buffer[] = [];
      const errorChunks: Buffer[] = [];

      pythonProcess.stdout.on('data', (data: Buffer) => {
        outputChunks.push(data);
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        errorChunks.push(data);
      });

      pythonProcess.on('close', (code, signal) => {
        clearTimeout(timeoutId);

        // Handle different exit scenarios
        if (signal) {
          reject(new Error(`Python process was terminated by signal: ${signal}`));
          return;
        }

        const output = Buffer.concat(outputChunks).toString('utf8');
        const error = Buffer.concat(errorChunks).toString('utf8');

        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${error}`));
          return;
        }

        try {
          // More robust JSON parsing with better error messages
          if (!output.trim()) {
            reject(new Error('Python process returned empty output'));
            return;
          }

          const result = JSON.parse(output) as AnalysisResult;

          // Basic validation of the result structure
          if (!this.isValidAnalysisResult(result)) {
            reject(new Error('Invalid analysis result structure returned from Python process'));
            return;
          }

          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse analysis results: ${parseError}. Raw output: ${output}`));
        }
      });

      // Send input to Python process with proper error handling
      try {
        pythonProcess.stdin.write(text, 'utf8');
        pythonProcess.stdin.end();
      } catch (writeError) {
        clearTimeout(timeoutId);
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Failed to write to Python process: ${writeError}`));
      }
    });
  }

  /**
   * Batch analyzes multiple legal documents with controlled concurrency
   * @param texts Array of legal document texts
   * @param concurrency Maximum number of concurrent analyses (default: 3)
   * @returns Promise resolving to array of analysis results
   */
  async analyzeDocuments(texts: string[], concurrency: number = 3): Promise<AnalysisResult[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // For small batches, use simple parallel processing
    if (texts.length <= concurrency) {
      return Promise.all(texts.map(text => this.analyzeDocument(text)));
    }

    // For larger batches, implement controlled concurrency to prevent resource exhaustion
    const results: AnalysisResult[] = new Array(texts.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < texts.length; i++) {
      const promise = this.analyzeDocument(texts[i])
        .then(result => {
          results[i] = result;
        })
        .catch(error => {
          // Re-throw with context about which document failed
          throw new Error(`Document ${i + 1} analysis failed: ${error.message}`);
        });

      executing.push(promise);

      // Control concurrency by waiting when we reach the limit
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises to maintain the concurrency limit
        for (let j = executing.length - 1; j >= 0; j--) {
          if (await this.isPromiseSettled(executing[j])) {
            executing.splice(j, 1);
          }
        }
      }
    }

    // Wait for all remaining promises to complete
    await Promise.all(executing);
    return results;
  }

  /**
   * Helper method to check if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('empty') ||
      message.includes('invalid') ||
      message.includes('parse') ||
      message.includes('validation')
    );
  }

  /**
   * Helper method to validate the structure of analysis results
   */
  private isValidAnalysisResult(result: any): result is AnalysisResult {
    // Basic structural validation - adapt this based on your AnalysisResult interface
    return result && typeof result === 'object';
  }

  /**
   * Helper method to create delays for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper method to check if a promise has settled (for concurrency control)
   */
  private async isPromiseSettled(promise: Promise<void>): Promise<boolean> {
    try {
      await Promise.race([
        promise,
        new Promise(resolve => setTimeout(resolve, 0))
      ]);
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Graceful shutdown method to clean up resources
   * Useful for application lifecycle management
   */
  async shutdown(): Promise<void> {
    // Currently no persistent resources to clean up
    // This method is here for future extensibility
    logger.info('LegalAnalysisService shutting down gracefully', { component: 'Chanuka' });
  }
}

// Export a singleton instance with default configuration
export const legalAnalysisService = new LegalAnalysisService();

















































