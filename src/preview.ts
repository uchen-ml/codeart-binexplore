import * as path from 'path';
import * as vscode from 'vscode';

const extensionScheme = 'uchenml.codeart-binexplore';
const previewTitle = 'CodeArt: Binary Explore';

class BinaryInspectorContentProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private content: string | undefined;

  /**
   * Provides the content for the given URI.
   * @param uri The URI of the document.
   * @returns The content of the document as a string.
   */
  public provideTextDocumentContent(uri: vscode.Uri): string {
    if (!uri.path.includes(`${previewTitle} - `)) {
      console.error('Invalid URI:', uri);
      return '';
    }

    return 'Lorem Ipsum';
  }

  /**
   * An event to signal that the content has changed.
   */
  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  /**
   * Updates the content for the given URI.
   * @param uri The URI of the document.
   */
  public update(uri: vscode.Uri) {
    this._onDidChange.fire(uri);
  }

  /**
   * Updates the displayed content for the opened binary file.
   * @param filePath The path to the binary file.
   */
  public exploreFile(filePath: string) {
    // TODO: Implement the logic to explore the binary file with objdump.
    this.content = `Exploring ${filePath}`;
  }
}

const provider = new BinaryInspectorContentProvider();

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.workspace.registerTextDocumentContentProvider(
    extensionScheme,
    provider
  );

  context.subscriptions.push(disposable);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {}

/**
 * Previews the output in a new editor column.
 */
export async function previewOutput(fileName: string) {
  provider.exploreFile(fileName);

  const uri = vscode.Uri.parse(
    `${extensionScheme}://authority/${previewTitle} - ${path.basename(fileName)}`
  );

  provider.update(uri);

  vscode.commands
    .executeCommand(
      'vscode.previewHtml',
      uri,
      vscode.ViewColumn.Two,
      'Binary Inspector'
    )
    .then(
      () => {},
      reason => {
        vscode.window.showErrorMessage(reason);
      }
    );

  vscode.workspace.openTextDocument(uri).then(document => {
    vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: false,
    });
  });
}
