import * as vscode from 'vscode';

const exec = require('child_process').exec;

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
          outputChannel.appendLine(
            `Error running objDump command: ${error.message}`
          );
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
export function execute(command: string): Promise<ExecOutput> {
  return new Promise((resolve, reject) => {
    exec(command, (error: Error | unknown, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          stdout,
          stderr,
        });
      }
    });
  });
}
