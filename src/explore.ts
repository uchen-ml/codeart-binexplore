import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dump from './objdump/dumper';

const OBJ_DUMP_PATH_KEY = 'codeart-binexplore.objdumpPath';
const OBJ_DUMP_OPTIONS_KEY = 'codeart-binexplore.objdumpOptions';

const DEFAULT_OBJ_DUMP_PATH = 'objdump';
const DEFAULT_OBJ_DUMP_OPTIONS = '-d -S';

const SECTION_REGEX_1 = /Disassembly of section \.([a-zA-Z0-9_.]+):/;
const SECTION_REGEX_2 = /Disassembly of section __TEXT,__(\w+):/;
const FUNCTION_REGEX = /^[0-9a-f]+ <(.+)>:$/;

let outputChannel: vscode.OutputChannel;
let statusBar: vscode.StatusBarItem;

/**
 * This method is called when the extension is activated.
 * @param context The context in which the extension is activated.
 */
export async function activate(
  context: vscode.ExtensionContext,
  extensionOutputChannel: vscode.OutputChannel,
) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(handleConfigurationChange),
    vscode.window.onDidChangeActiveTextEditor(handleStatusBarVisibility),
  );

  outputChannel = extensionOutputChannel;

  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
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
    OBJ_DUMP_PATH_KEY,
    DEFAULT_OBJ_DUMP_PATH,
  );

  let isObjDumpPathValid = objDumpPath === DEFAULT_OBJ_DUMP_PATH;
  if (!isObjDumpPathValid) {
    isObjDumpPathValid = await dump.isObjDumpBinary(objDumpPath);
  }

  if (!isObjDumpPathValid) {
    await Promise.all([
      vscode.window.showWarningMessage(`Invalid objDump path: ${objDumpPath}.`),
      resetObjDumpPath(),
    ]);
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

  await configuration.update(
    OBJ_DUMP_PATH_KEY,
    DEFAULT_OBJ_DUMP_PATH,
    vscode.ConfigurationTarget.Global,
  );
}

/**
 * Handles configuration changes.
 * @param event - The configuration change event.
 */
async function handleConfigurationChange(
  event: vscode.ConfigurationChangeEvent,
) {
  if (event.affectsConfiguration(OBJ_DUMP_PATH_KEY)) {
    await validateObjDumpBinary();
  }
}

/**
 * Handles the visibility of the status bar.
 */
async function handleStatusBarVisibility(
  editor: vscode.TextEditor | undefined,
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
      OBJ_DUMP_PATH_KEY,
      DEFAULT_OBJ_DUMP_PATH,
    );
    const args = this.getArgs(configuration);

    const objDumper = new dump.ObjDumper(
      filePath,
      objDumpPath,
      args,
      outputChannel,
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
    configuration: vscode.WorkspaceConfiguration,
  ): string[] {
    const cliObjDumpOptions = configuration.get<string>(
      OBJ_DUMP_OPTIONS_KEY,
      DEFAULT_OBJ_DUMP_OPTIONS,
    );

    if (cliObjDumpOptions.length > 0) {
      return cliObjDumpOptions.split(' ');
    }

    return DEFAULT_OBJ_DUMP_OPTIONS.split(' ');
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
  document: vscode.TextDocument,
): vscode.DocumentSymbol[] {
  const items: vscode.DocumentSymbol[] = [];

  let line = 0;
  while (line < document.lineCount) {
    const text = document.lineAt(line).text;
    const sectionMatch =
      text.match(SECTION_REGEX_1) || text.match(SECTION_REGEX_2);

    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      const [section, newLine] = getSection(document, line, sectionName);
      items.push(section);
      line = newLine;
    } else {
      line++;
    }
  }

  return items;
}

/**
 * Gets the section symbol.
 * @param document The document.
 * @param line The line number.
 * @param sectionName The name of the section.
 * @returns The section symbol.
 * @returns The line number after the section.
 */
function getSection(
  document: vscode.TextDocument,
  line: number,
  sectionName: string,
): [vscode.DocumentSymbol, number] {
  const text = document.lineAt(line).text;
  const position = new vscode.Position(line, text.indexOf(sectionName));
  const range = new vscode.Range(
    position,
    position.translate(0, sectionName.length),
  );

  const section = new vscode.DocumentSymbol(
    sectionName,
    '',
    vscode.SymbolKind.Namespace,
    range,
    range,
  );

  const [children, atLine] = getSectionSymbols(document, line + 1);

  section.children = children;
  return [section, atLine];
}

/**
 * Gets the symbols for a section.
 * @param document The document.
 * @param line The line number.
 * @returns The symbols for the section.
 * @returns The line number after the section.
 */
function getSectionSymbols(
  document: vscode.TextDocument,
  line: number,
): [vscode.DocumentSymbol[], number] {
  const functionSymbols: vscode.DocumentSymbol[] = [];

  while (line < document.lineCount) {
    const text = document.lineAt(line).text;

    const parentMatch =
      text.match(SECTION_REGEX_1) || text.match(SECTION_REGEX_2);
    if (parentMatch) {
      return [functionSymbols, line];
    }

    const match = text.match(FUNCTION_REGEX);

    if (match) {
      const name = match[1];
      const position = new vscode.Position(line, text.indexOf(name));
      const range = new vscode.Range(
        position,
        position.translate(0, name.length),
      );
      const symbol = new vscode.DocumentSymbol(
        name,
        '',
        vscode.SymbolKind.Function,
        range,
        range,
      );
      functionSymbols.push(symbol);
    }

    line++;
  }
  return [functionSymbols, line];
}
