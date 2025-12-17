// File Utility Functions
import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
  static async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async ensureDirectory(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  static getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  static isTypeScriptFile(filePath: string): boolean {
    const ext = this.getFileExtension(filePath);
    return ext === '.ts' || ext === '.tsx';
  }

  static async findFiles(directory: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await traverse(directory);
    return files;
  }
}