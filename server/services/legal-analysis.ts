import { spawn } from 'child_process';
import path from 'path';
import { AnalysisResult } from '../../../shared/types/legal-analysis.js';

export class LegalAnalysisService {
  private readonly pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = path.join(__dirname, '../../../ml/legal_analysis.py');
  }

  /**
   * Analyzes legal document text using the Python ML model
   * @param text The legal document text to analyze
   * @returns Promise resolving to the analysis results
   */
  async analyzeDocument(text: string): Promise<AnalysisResult> {
    try {
      const pythonProcess = spawn('python', [this.pythonScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Send input to Python process
      pythonProcess.stdin.write(text);
      pythonProcess.stdin.end();

      // Collect output
      let output = '';
      pythonProcess.stdout.on('data', data => {
        output += data.toString();
      });

      // Handle errors
      let error = '';
      pythonProcess.stderr.on('data', data => {
        error += data.toString();
      });

      // Wait for process to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', code => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${error}`));
          } else {
            resolve(null);
          }
        });
      });

      // Parse and return results
      return JSON.parse(output) as AnalysisResult;
    } catch (err) {
      throw new Error(
        `Failed to analyze document: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Batch analyzes multiple legal documents
   * @param texts Array of legal document texts
   * @returns Promise resolving to array of analysis results
   */
  async analyzeDocuments(texts: string[]): Promise<AnalysisResult[]> {
    return Promise.all(texts.map(text => this.analyzeDocument(text)));
  }
}

export const legalAnalysisService = new LegalAnalysisService();
