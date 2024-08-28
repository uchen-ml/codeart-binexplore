import * as process from 'child_process';
import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Class representing an ObjDumper.
 * This class is responsible for running the objDump command on a given file.
 */
export class ObjDumper {
  /**
   * Create an ObjDumper.
   * @param {string} filePath - The path to the file to be analyzed.
   * @param {string} objDumpPath - The path to the objDump executable.
   * @param {string[]} args - The arguments to pass to the objDump command.
   */
  constructor(
    private readonly filePath: string,
    private readonly objDumpPath: string,
    private readonly args: string[],
    extensionOutputChannel?: vscode.OutputChannel
  ) {
    outputChannel = extensionOutputChannel;
  }

  /**
   * Run the objDump command and return the output.
   * @returns {Promise<string>} The output of the objDump command.
   * @returns "ERROR" if the command fails.
   */
  public async dump(): Promise<string> {
    try {
      const output = await execute(this.objDumpPath, this.args, this.filePath);

      if (output.stderr !== '') {
        if (outputChannel) {
          outputChannel.appendLine('Error running objDump command:');
          outputChannel.appendLine(output.stderr);
          outputChannel.show();
        }
        return 'ERROR';
      }
      return output.stdout;
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        if (outputChannel) {
          outputChannel.appendLine('Error running objDump command:');
          outputChannel.appendLine(error.message);
          outputChannel.show();
        }
      }
      return 'ERROR';
    }
  }
}

/**
 * Interface representing the output of a command execution.
 * @property {string} stdout - The standard output of the command.
 * @property {string} stderr - The standard error of the command.
 */
export interface ExecOutput {
  stdout: string;
  stderr: string;
}

/**
 * Executes a CLI command synchronously.
 * @param command - The command to execute.
 * @returns The output of the command.
 */
async function execute(
  objDumpPath: string,
  args: string[] = [],
  filePath: string = ''
): Promise<ExecOutput> {
  try {
    const childProcess = process.spawn(objDumpPath, [...args, filePath]);
    const result = await new Promise<ExecOutput>(resolve => {
      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      childProcess.on('exit', code => {
        resolve({stdout, stderr});
      });

      childProcess.on('error', error => {
        stderr += error.message;
        resolve({stdout, stderr});
      });

      childProcess.on('close', code => {
        resolve({stdout, stderr});
      });
    });
    return result;
  } catch (error: Error | unknown) {
    let stderr = 'ERROR';
    if (error instanceof Error) {
      if (outputChannel) {
        outputChannel.appendLine(`Error executing command: ${error.message}`);
      }
      stderr = error.message;
    }
    return {stdout: '', stderr: stderr};
  }
}

/**
 * Checks if objdump path is actually an objdump binary.
 * @param path - The path to the objdump binary.
 * @returns True if the path is a valid objdump binary, false otherwise.
 */
export async function isObjDumpBinary(path: string): Promise<boolean> {
  try {
    const output = await execute(path, ['--help']);

    // TODO: Add more valid objdump outputs based on different supported versions, and OS.
    const validObjdumpOutputs = [
      'objdump [options] <input object files>',
      `Usage: ${path} <option(s)> <file(s)>`,
    ];

    for (const validOutput of validObjdumpOutputs) {
      if (output.stdout.includes(validOutput)) {
        return true;
      }
    }

    return false;
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      if (outputChannel) {
        outputChannel.appendLine(
          `Error checking if "${path}" is an objdump binary: ${error.message}`
        );
      }
    }
    return false;
  }
}

/**
 * Checks objdump version.
 * @param path - The path to the objdump binary.
 * @returns The version of the objdump binary.
 * @returns "ERROR" if the command fails.
 */
export async function getObjDumpVersion(path: string): Promise<string> {
  const isBinary = await isObjDumpBinary(path);

  if (!isBinary) {
    return 'ERROR';
  }

  try {
    const output = await execute(path, ['--version']);
    return output.stdout.split('\n')[0];
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      if (outputChannel) {
        outputChannel.appendLine(
          `Error getting objdump version for "${path}": ${error.message}`
        );
      }
    }
    return 'ERROR';
  }
}
