import * as vscode from 'vscode';
import * as os from 'os';
import * as preview from './preview';

const outputChannel = vscode.window.createOutputChannel(
  'CodeArt: Binary Explore',
);

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export async function activate(context: vscode.ExtensionContext) {
  await preview.activate(context, outputChannel);

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
  void preview.deactivate();
}
