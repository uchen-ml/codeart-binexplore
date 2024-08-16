import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as preview from './preview';

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.workspace.onDidOpenTextDocument(async document => {
    if (isExecutable(document.fileName)) {
      await preview.previewOutput(document.fileName);
    }
  });

  context.subscriptions.push(disposable);

  preview.activate(context);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
  preview.deactivate();
}

/**
 * Checks if a file is a binary executable.
 * @param filePath The path to the file.
 * @returns True if the file is a binary executable, false otherwise.
 */
function isExecutable(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const stats = fs.statSync(filePath);

    const isExecutable = (stats.mode & 0o111) !== 0;
    const isWinExecutable =
      filePath.endsWith('.exe') && os.platform() === 'win32';

    return isExecutable || isWinExecutable;
  } catch (error) {
    console.error(error);
    return false;
  }
}
