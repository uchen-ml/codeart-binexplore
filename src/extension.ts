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

    try {
      const isExecutable = await preview.isExecutable(document.fileName);
      const isObjectFile = await preview.isObjectFile(document.fileName);
      if (isExecutable || isObjectFile) {
        await preview.previewOutput(document.fileName);
      }
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        outputChannel.appendLine(
          `Error exploring ${document.fileName}: 
          ${error.message}`
        );
      }
    }
  });

  context.subscriptions.push(disposable);

  preview.activate(context, outputChannel);

  outputChannel.appendLine('CodeArt: Binary Explore is now active.');
  outputChannel.appendLine(`os.platform() = ${os.platform()}`);
  outputChannel.appendLine(`os.arch() = ${os.arch()}`);
  outputChannel.appendLine(`os.release() = ${os.release()}`);
  outputChannel.appendLine(`os.type() = ${os.type()}`);
  outputChannel.appendLine('');
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
  preview.deactivate();
}
