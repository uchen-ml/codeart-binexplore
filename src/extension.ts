import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as preview from './preview';

const outputChannel = vscode.window.createOutputChannel(
  'CodeArt: Binary Explore'
);

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.workspace.onDidOpenTextDocument(async document => {
    if (document.uri.scheme !== 'file') {
      return;
    }

    if (await isExecutable(document.fileName)) {
      await preview.previewOutput(document.fileName);
    }
  });

  context.subscriptions.push(disposable);

  preview.activate(context, outputChannel);

  outputChannel.appendLine('CodeArt: Binary Explore is now active.');
  outputChannel.appendLine(`os.platform() = ${os.platform()}`);
  outputChannel.appendLine(`os.arch() = ${os.arch()}`);
  outputChannel.appendLine(`os.release() = ${os.release()}`);
  outputChannel.show();
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
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(filePath);
    const isExecutable = (stats.mode & 0o111) !== 0;

    return isExecutable;
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(`Error accessing ${filePath}: ${error.message}`);
    }
    return false;
  }
}
