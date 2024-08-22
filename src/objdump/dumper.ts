import {exec as execCallback} from 'child_process';
import {promisify} from 'util';
import * as vscode from 'vscode';

const exec = promisify(execCallback);

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Class representing an ObjDumper.
 * This class is responsible for running the objDump command on a given file.
 */
export class ObjDumper {
  private filePath: string;
  private objDumpPath: string;
  private args: string[] = [];

  /**
   * Create an ObjDumper.
   * @param {string} filePath - The path to the file to be analyzed.
   * @param {string} objDumpPath - The path to the objDump executable.
   * @param {string[]} args - The arguments to pass to the objDump command.
   */
  constructor(
    filePath: string,
    objDumpPath: string,
    args: string[],
    extensionOutputChannel?: vscode.OutputChannel
  ) {
    this.filePath = filePath;
    this.objDumpPath = objDumpPath;
    this.args = args;
    outputChannel = extensionOutputChannel;
  }

  /**
   * Run the objDump command and return the output.
   * @returns {Promise<string>} The output of the objDump command.
   * @returns "ERROR" if the command fails.
   */
  public async dump(): Promise<string> {
    try {
      const command = `${this.objDumpPath} ${this.args.join(' ')} ${this.filePath}`;
      if (outputChannel) {
        outputChannel.appendLine(`Running: "${command}"`);
      }

      const output = await execute(command);
      return output.stdout;
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        if (outputChannel) {
          outputChannel.appendLine('Error running objDump command:');
          outputChannel.appendLine(error.message);
          outputChannel.show();
        } else {
          console.error(error);
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
export async function execute(command: string): Promise<ExecOutput> {
  try {
    const {stdout, stderr} = await exec(command);
    const output: ExecOutput = {stdout, stderr};
    return output;
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      if (outputChannel) {
        outputChannel.appendLine(`Error executing command: ${error.message}`);
      } else {
        console.error(error);
      }
    }
    return {stdout: '', stderr: ''};
  }
}

/**
 * Checks if objdump path is actually an objdump binary.
 * @param path - The path to the objdump binary.
 * @returns True if the path is a valid objdump binary, false otherwise.
 */
export async function isObjDumpBinary(path: string): Promise<boolean> {
  try {
    const command = `${path} --help`;
    const output = await execute(command);
    return output.stdout.includes('objdump [options] <input object files>');
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      if (outputChannel) {
        outputChannel.appendLine(
          `Error checking if "${path}" is an objdump binary: ${error.message}`
        );
      } else {
        console.error(error);
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
  try {
    const command = `${path} --version`;
    const output = await execute(command);
    return output.stdout.split('\n')[0];
  } catch (error: Error | unknown) {
    if (error instanceof Error) {
      if (outputChannel) {
        outputChannel.appendLine(
          `Error getting objdump version for "${path}": ${error.message}`
        );
      } else {
        console.error(error);
      }
    }
    return 'ERROR';
  }
}
