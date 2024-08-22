import * as path from 'path';
import * as vscode from 'vscode';
import * as explore from './explore';

const extensionScheme = 'uchenml.codeart-binexplore';
const previewTitle = 'CodeArt: Binary Explore';

let outputChannel: vscode.OutputChannel;

class BinaryInspectorContentProvider
  implements vscode.TextDocumentContentProvider
{
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  private content: string | undefined;

  /**
   * Provides the content for the given URI.
   * @param uri The URI of the document.
   * @returns The content of the document as a string.
   */
  public provideTextDocumentContent(uri: vscode.Uri): string {
    try {
      if (!uri.path.includes(`${previewTitle} - `)) {
        outputChannel.appendLine(`Invalid URI: ${uri}`);
        return '';
      }

      return this.content || '';
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        outputChannel.appendLine(
          `Error providing content for ${uri.path}: ${error.message}`
        );
      }
      return '';
    }
  }

  /**
   * An event to signal that the content has changed.
   */
  get onDidChange(): vscode.Event<vscode.Uri> {
    return this.onDidChangeEmitter.event;
  }

  /**
   * Updates the content for the given URI.
   * @param uri The URI of the document.
   */
  public update(uri: vscode.Uri) {
    this.onDidChangeEmitter.fire(uri);
  }

  /**
   * Updates the displayed content for the opened binary file.
   * @param filePath The path to the binary file.
   */
  public async exploreFile(filePath: string): Promise<boolean> {
    const objDumpResult = await explore.ObjDumpResult.create(filePath);
    this.content = objDumpResult.output;

    return this.content !== 'ERROR';
  }
}

const provider = new BinaryInspectorContentProvider();

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export async function activate(
  context: vscode.ExtensionContext,
  extensionOutputChannel: vscode.OutputChannel
) {
  const disposable = await vscode.workspace.registerTextDocumentContentProvider(
    extensionScheme,
    provider
  );

  context.subscriptions.push(disposable);

  await explore.activate(context, extensionOutputChannel);

  outputChannel = extensionOutputChannel;
}

/**
 * This method is called when the extension is deactivated.
 */
export async function deactivate() {
  await explore.deactivate();
}

/**
 * Previews the output in a new editor column.
 */
export async function previewOutput(fileName: string) {
  const isExplored = await provider.exploreFile(fileName);

  if (!isExplored) {
    await vscode.window.showWarningMessage(
      `Failed to explore ${path.basename(fileName)}, check output for more details.`
    );
    return;
  }

  const uri = await vscode.Uri.parse(
    `${extensionScheme}://authority/${previewTitle} - ${path.basename(fileName)}`
  );

  await provider.update(uri);

  try {
    await vscode.commands.executeCommand(
      'vscode.open',
      uri,
      vscode.ViewColumn.Two,
      'Binary Inspector'
    );
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(
        `Error generating CodeArt for ${path.basename(fileName)}: ${error.message}`
      );
    }
    return;
  }

  try {
    const codeArtDocument = await vscode.workspace.openTextDocument(uri);

    if (codeArtDocument) {
      await vscode.window.showTextDocument(codeArtDocument, {
        preview: false,
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: false,
      });
    } else {
      outputChannel.appendLine(
        `Failed to open CodeArt results for ${path.basename(fileName)} `
      );
    }
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(
        `Error opening CodeArt results: ${error.message}`
      );
    }
    return;
  }
}

/**
 * Checks if a file is a binary executable.
 * @param filePath The path to the file.
 * @returns True if the file is a binary executable, false otherwise.
 */
export async function isExecutable(filePath: string): Promise<boolean> {
  return await explore.isExecutable(filePath);
}
