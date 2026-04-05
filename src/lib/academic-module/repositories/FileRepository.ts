import fs from 'fs';
import path from 'path';

export class FileRepository {
  readConfig(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error("File nuk u gjet, po krijoj file të ri...");
      }
      return fs.readFileSync(filePath, 'utf8');
    } catch (error: any) {
      if (error.message === "File nuk u gjet, po krijoj file të ri...") {
        throw error;
      }
      throw new Error("Gabim gjatë leximit të file-it: " + error.message);
    }
  }

  writeReport(filePath: string, content: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error: any) {
      throw new Error("Gabim gjatë shkrimit të file-it: " + error.message);
    }
  }
}
