import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import * as preview from '../src/preview';
import * as explore from '../src/explore';

const objDumpPathKey = 'codeart-binexplore.objdumpPath';
const objDumpOptionsKey = 'codeart-binexplore.objdumpOptions';

suite('Extension Test Suite', () => {
  test('Opening Binary File', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders, 'No workspace is open');

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const fileName = 'vector_debug';
    const filePath = path.join(workspaceRoot, fileName);

    const objdumpPath = '/usr/bin/objdump';
    const args = ['-d', '-S'];

    const configuration = await vscode.workspace.getConfiguration();
    await configuration.update(objDumpPathKey, objdumpPath);
    await configuration.update(objDumpOptionsKey, args.join(' '));

    await preview.previewOutput(filePath);
  });

  test('System path objdump', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders, 'No workspace is open');

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const fileName = 'vector_debug';
    const filePath = path.join(workspaceRoot, fileName);

    const objdumpPath = 'objdump';
    const args = ['-d', '-S'];

    const configuration = await vscode.workspace.getConfiguration();
    await configuration.update(objDumpPathKey, objdumpPath);
    await configuration.update(objDumpOptionsKey, args.join(' '));

    await preview.previewOutput(filePath);
  });
});
