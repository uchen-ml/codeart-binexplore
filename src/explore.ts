import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dump from './objdump/dumper';

const objDumpPathKey = 'codeart-binexplore.objdumpPath';
const buildArgsKey = 'codeart-binexplore.buildArgs';

const defaultObjDumpPath = '/usr/bin/objdump';

let outputChannel: vscode.OutputChannel;

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

  const configuration = vscode.workspace.getConfiguration();
  const objDumpPath = configuration.get<string>(
    objDumpPathKey,
    defaultObjDumpPath
  );

  outputChannel = extensionOutputChannel;

  const isObjDumpPathValid = await validateObjDumpPath(objDumpPath);
  if (!isObjDumpPathValid) {
    resetObjDumpPath();
  }
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {}

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

    const stats = await fs.promises.stat(path);
    const isExecutable = (stats.mode & 0o111) !== 0;

    return isExecutable;
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      outputChannel.appendLine(
        `Error validating objdump path "${path}": ${error.message}`
      );
      return false;
    }
  }

  return false;
}

/**
 * Resets the objDump path to the default value.
 */
function resetObjDumpPath() {
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
    const configuration = vscode.workspace.getConfiguration();
    const objDumpPath = configuration.get<string>(
      objDumpPathKey,
      defaultObjDumpPath
    );

    const isObjDumpPathValid = await validateObjDumpPath(objDumpPath);

    if (!isObjDumpPathValid) {
      vscode.window.showWarningMessage(
        `Invalid objDump path: ${objDumpPath}. Resetting to default.`
      );
      resetObjDumpPath();
    }
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
   * @returns The arguments to pass to the objDump command.
   * @returns An ['-d'] if no arguments are provided, as default argument.
   */
  private static getArgs(
    configuration: vscode.WorkspaceConfiguration
  ): string[] {
    const cliBuildArgs = configuration
      .get<string>(buildArgsKey, '-d -S')
      .split(' ');

    if (cliBuildArgs.length > 0) {
      return cliBuildArgs;
    }

    return ['-d'];
  }
}
