import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dump from './objdump/dumper';

const objDumpPathKey = 'codeart-binexplore.objdumpPath';
const buildArgsKey = 'codeart-binexplore.buildArgs';

const defaultObjDumpPath = '/usr/bin/objdump';
const defaultBuildArgs = '-d -S';

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
  const disposable = vscode.workspace.onDidChangeConfiguration(
    await handleConfigurationChange
  );
  context.subscriptions.push(disposable);

  outputChannel = extensionOutputChannel;

  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  await vscode.window.onDidChangeActiveTextEditor(
    await handleStatusBarVisibility
  );

  await validateObjDumpBinary();
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

  const isObjDumpPathValid = await validateObjDumpPath(objDumpPath);

  if (!isObjDumpPathValid) {
    vscode.window.showWarningMessage(
      `Invalid objDump path: ${objDumpPath}. 
        Fetching the path from the system $PATH.`
    );
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
 * Validates the objDump path.
 * @param path - The path to validate.
 * @returns True if the path is valid and executable, false otherwise.
 */
async function validateObjDumpPath(path: string): Promise<boolean> {
  if (!path) {
    return false;
  }

  try {
    // Special case for 'objdump' command, to be fetched from $PATH.
    if (path === 'objdump') {
      const command = 'which objdump';
      const commandResult = await dump.execute(command);
      const resolvedPath = commandResult.stdout.trim();

      await fs.promises.access(resolvedPath, fs.constants.F_OK);
      path = resolvedPath;
      outputChannel.appendLine(
        `Using objdump from system path: ${resolvedPath}`
      );
    }

    if (await isExecutable(path)) {
      const isObjDumpBinary = await dump.isObjDumpBinary(path);
      return isObjDumpBinary;
    }

    return false;
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(
        `Error validating objdump path "${path}": 
        ${error.message}`
      );
      return false;
    }
  }

  return false;
}

/**
 * Resets the objDump path to the default value.
 */
async function resetObjDumpPath() {
  const configuration = vscode.workspace.getConfiguration();

  const command = 'which objdump';
  const commandResult = await dump.execute(command);

  let resolvedPath = commandResult.stdout.trim();
  if (resolvedPath === '') {
    vscode.window.showErrorMessage(
      'Failed to find objdump in system path. check output for more details.'
    );
    outputChannel.appendLine(
      `Failed to find objdump in system path. Setting it as the default value of 
      '${defaultObjDumpPath}'. 
      If this path is not valid on your system, please set the correct path manually.`
    );
    resolvedPath = defaultObjDumpPath;
  }

  configuration.update(
    objDumpPathKey,
    resolvedPath,
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

  // TODO: Handle changes in buildArgsKey.
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
    const cliBuildArgs = configuration.get<string>(
      buildArgsKey,
      defaultBuildArgs
    );

    if (cliBuildArgs.length > 0) {
      return cliBuildArgs.split(' ');
    }

    return defaultBuildArgs.split(' ');
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
