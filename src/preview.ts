import * as path from 'path';
import * as vscode from 'vscode';
import * as explore from './explore';

const extensionScheme = 'uchenml.codeart-binexplore';
const extensionLanguageId = 'codeart-binexplore';
const previewTitle = 'CodeArt: Binary Explore';
const autoSaveKey = 'codeart-binexplore.saveCodeArtFiles';

let outputChannel: vscode.OutputChannel;

class CodeArtContentProvider implements vscode.TextDocumentContentProvider {
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

      if (this.content && this.content.startsWith('\n')) {
        this.content = this.content.slice(1);
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

    if (this.content === '') {
      return false;
    }

    return this.content !== 'ERROR';
  }
}

/**
 * Provides the symbols for the CodeArt document.
 */
class CodeArtSymbolProvider implements vscode.DocumentSymbolProvider {
  /**
   * Provides the symbols for the given document.
   * @param document The CodeArt document to provide symbols for.
   * @param token A cancellation token.
   * @returns The symbols for the document.
   */
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const codeArtSymbols: vscode.DocumentSymbol[] =
      explore.getCodeArtSymbols(document);
    return codeArtSymbols;
  }
}

const provider = new CodeArtContentProvider();

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export async function activate(
  context: vscode.ExtensionContext,
  extensionOutputChannel: vscode.OutputChannel
) {
  let disposable = await vscode.workspace.onDidOpenTextDocument(
    analyzeOpenedDocument
  );
  context.subscriptions.push(disposable);

  disposable = await vscode.workspace.registerTextDocumentContentProvider(
    extensionScheme,
    provider
  );
  context.subscriptions.push(disposable);

  disposable = await vscode.languages.registerDocumentSymbolProvider(
    {
      scheme: extensionScheme,
    },
    new CodeArtSymbolProvider()
  );
  context.subscriptions.push(disposable);

  disposable = await vscode.languages.registerDocumentSymbolProvider(
    {
      scheme: 'file',
      language: extensionLanguageId,
    },
    new CodeArtSymbolProvider()
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
 * Analyzes the opened document and previews the output if it is an executable or object file.
 * @param document The opened document.
 */
async function analyzeOpenedDocument(document: vscode.TextDocument) {
  if (document.uri.scheme !== 'file') {
    return;
  }

  try {
    const [isExecutable, isObjectFile] = await Promise.all([
      explore.isExecutable(document.fileName),
      explore.isObjectFile(document.fileName),
    ]);
    if (isExecutable || isObjectFile) {
      await previewOutput(document.fileName);
    }
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(
        `Error exploring ${document.fileName}: 
          ${error.message}`
      );
    }
  }
}

/**
 * Previews the output in a new editor column.
 */
async function previewOutput(fileName: string) {
  const isExplored = await provider.exploreFile(fileName);

  if (!isExplored) {
    await vscode.window.showWarningMessage(
      `Failed to explore ${path.basename(fileName)}, check output for more details.`
    );
    return;
  }

  const filePath = path.dirname(fileName);

  const uri = await vscode.Uri.parse(
    `${extensionScheme}://${filePath}/${previewTitle} - ${path.basename(fileName)}`
  );

  await provider.update(uri);

  try {
    await vscode.commands.executeCommand('vscode.open', uri);
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
    vscode.languages.setTextDocumentLanguage(
      codeArtDocument,
      extensionLanguageId
    );

    if (codeArtDocument) {
      const viewOptions: vscode.TextDocumentShowOptions = {
        preview: false,
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: false,
      };

      const codeArtEditor = await vscode.window.showTextDocument(
        codeArtDocument,
        viewOptions
      );

      const configuration = vscode.workspace.getConfiguration();
      const autoSaveEnabled = configuration.get<boolean>(autoSaveKey, false);

      if (autoSaveEnabled) {
        const savedUri = vscode.Uri.parse(
          `file://${filePath}/.${path.basename(fileName)}.uc`
        );
        await vscode.workspace.fs.writeFile(
          savedUri,
          Buffer.from(codeArtDocument.getText())
        );
      }
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
