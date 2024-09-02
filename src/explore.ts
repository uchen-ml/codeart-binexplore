import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dump from './objdump/dumper';

const objDumpPathKey = 'codeart-binexplore.objdumpPath';
const objDumpOptionsKey = 'codeart-binexplore.objdumpOptions';

const defaultObjDumpPath = 'objdump';
const defaultObjDumpOptions = '-d -S';

let outputChannel: vscode.OutputChannel;
let statusBar: vscode.StatusBarItem;

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export async function activate(
  context: vscode.ExtensionContext,
  extensionOutputChannel: vscode.OutputChannel
) {
  const disposable = await vscode.workspace.onDidChangeConfiguration(
    handleConfigurationChange
  );
  context.subscriptions.push(disposable);

  outputChannel = extensionOutputChannel;

  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  await vscode.window.onDidChangeActiveTextEditor(handleStatusBarVisibility);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {}

/**
 * Validates the objDump binary.
 */
async function validateObjDumpBinary() {
  const configuration = vscode.workspace.getConfiguration();
  const objDumpPath = configuration.get<string>(
    objDumpPathKey,
    defaultObjDumpPath
  );

  let isObjDumpPathValid = objDumpPath === defaultObjDumpPath;
  if (!isObjDumpPathValid) {
    isObjDumpPathValid = await dump.isObjDumpBinary(objDumpPath);
  }

  if (!isObjDumpPathValid) {
    vscode.window.showWarningMessage(`Invalid objDump path: ${objDumpPath}.`);
    await resetObjDumpPath();
    return;
  }

  const objDumpVersion = await dump.getObjDumpVersion(objDumpPath);
  outputChannel.appendLine(`objdump path: ${objDumpPath}`);
  if (objDumpVersion !== 'ERROR') {
    outputChannel.appendLine(`objdump version: ${objDumpVersion}`);
    statusBar.text = `${objDumpPath} (${objDumpVersion})`;
  } else {
    statusBar.text = `${objDumpPath} (Invalid Version)`;
  }

  outputChannel.appendLine('');
}

/**
 * Resets the objDump path to the default value.
 */
async function resetObjDumpPath() {
  const configuration = vscode.workspace.getConfiguration();

  configuration.update(
    objDumpPathKey,
    defaultObjDumpPath,
    vscode.ConfigurationTarget.Global
  );
}

/**
 * Handles configuration changes.
 * @param event - The configuration change event.
 */
async function handleConfigurationChange(
  event: vscode.ConfigurationChangeEvent
) {
  if (event.affectsConfiguration(objDumpPathKey)) {
    await validateObjDumpBinary();
  }
}

/**
 * Handles the visibility of the status bar.
 */
async function handleStatusBarVisibility(
  editor: vscode.TextEditor | undefined
) {
  const document = editor?.document;
  if (document) {
    const isFile = document.uri.scheme === 'file';
    const isExecutableFile = isFile && (await isExecutable(document.fileName));

    if (
      isExecutableFile ||
      document.uri.path.includes('CodeArt: Binary Explore')
    ) {
      statusBar.show();
    } else {
      statusBar.hide();
    }
  } else {
    statusBar.hide();
  }
}

export class ObjDumpResult {
  /**
   * The path to the file to be analyzed.
   */
  public readonly filePath: string;
  /**
   * The output of the objDump command.
   * @returns "ERROR" if the command fails.
   */
  public readonly output?: string;

  /**
   * Creates a new ObjDumpResult.
   * @param filePath - The path to the file to be analyzed.
   * @param output - The output of the objDump command.
   * @returns A new ObjDumpResult.
   */
  private constructor(filePath: string, output: string | undefined) {
    this.filePath = filePath;
    this.output = output;
  }

  /**
   * Creates a new ObjDumpResult.
   * @param filePath - The path to the file to be analyzed.
   * @returns A new ObjDumpResult.
   */
  public static async create(filePath: string): Promise<ObjDumpResult> {
    const configuration = vscode.workspace.getConfiguration();
    const objDumpPath = configuration.get<string>(
      objDumpPathKey,
      defaultObjDumpPath
    );
    const args = this.getArgs(configuration);

    const objDumper = new dump.ObjDumper(
      filePath,
      objDumpPath,
      args,
      outputChannel
    );

    const output = await objDumper.dump();
    return new ObjDumpResult(filePath, output);
  }

  /**
   * Gets the arguments to pass to the objDump command.
   * @param configuration The workspace configuration.
   * @returns The arguments to pass to the objDump command.
   * @default ['-d', '-S']
   */
  private static getArgs(
    configuration: vscode.WorkspaceConfiguration
  ): string[] {
    const cliObjDumpOptions = configuration.get<string>(
      objDumpOptionsKey,
      defaultObjDumpOptions
    );

    if (cliObjDumpOptions.length > 0) {
      return cliObjDumpOptions.split(' ');
    }

    return defaultObjDumpOptions.split(' ');
  }
}

/**
 * Checks if a file is a binary executable.
 * @param filePath The path to the file.
 * @returns True if the file is a binary executable, false otherwise.
 */
export async function isExecutable(filePath: string): Promise<boolean> {
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

/**
 * Checks if a file is an object file.
 * @param filePath The path to the file
 * @returns True if the file is an object file, false otherwise.
 */
export async function isObjectFile(filePath: string): Promise<boolean> {
  try {
    const buffer = Buffer.alloc(4);
    const fileHandle = await fs.promises.open(filePath, 'r');
    await fileHandle.read(buffer, 0, 4, 0);
    await fileHandle.close();

    const elfMagic = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
    const coffMagic = Buffer.from([0x4c, 0x01]);

    const isObjectFile =
      buffer.equals(elfMagic) || buffer.slice(0, 2).equals(coffMagic);
    return isObjectFile;
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(`Error accessing ${filePath}: ${error.message}`);
    }
    return false;
  }
}

/**
 * Gets the codeart symbols for a document.
 * @param document The document.
 * @returns The codeart symbols.
 */
export function getCodeArtSymbols(
  document: vscode.TextDocument
): vscode.DocumentSymbol[] {
  const items: vscode.DocumentSymbol[] = [];
  let parent: vscode.DocumentSymbol | undefined;

  for (let line = 0; line < document.lineCount; line++) {
    const text = document.lineAt(line).text;
    const match = text.match(/^[0-9a-f]+ <(\w+)>:/);
    const parentMatch =
      text.match(/Disassembly of section \.([a-zA-Z0-9_.]+):/) ||
      text.match(/Disassembly of section __TEXT,__(\w+):/);

    if (match) {
      const name = match[1];
      const position = new vscode.Position(line, text.indexOf(name));
      const range = new vscode.Range(
        position,
        position.translate(0, name.length)
      );
      const symbol = new vscode.DocumentSymbol(
        name,
        '',
        vscode.SymbolKind.Function,
        range,
        range
      );
      parent?.children?.push(symbol);
    } else if (parentMatch) {
      if (parent) {
        items.push(parent);
      }

      const name = parentMatch[1];
      const position = new vscode.Position(line, text.indexOf(name));
      const range = new vscode.Range(
        position,
        position.translate(0, name.length)
      );
      parent = new vscode.DocumentSymbol(
        parentMatch[1],
        '',
        vscode.SymbolKind.Namespace,
        range,
        range
      );
    }
  }

  if (parent) {
    items.push(parent);
  }

  return items;
}
