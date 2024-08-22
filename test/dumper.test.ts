import * as assert from 'assert';
import * as fs from 'fs';
import {
  ObjDumper,
  ExecOutput,
  isObjDumpBinary,
  getObjDumpVersion,
} from '../src/objdump/dumper';

suite('ObjDumper Tests', () => {
  setup(() => {});

  teardown(() => {});

  test('Dump: valid executable - debug', async () => {
    const filePath = 'examples/build/macos/vector_debug';
    const objDumpPath = '/usr/bin/objdump';
    const args = ['-d', '-S'];

    const expectedOutput = await fs.promises
      .readFile('examples/build/macos/vector_debug.objdump')
      .then(data => data.toString());
    const executeStub = async (command: string): Promise<ExecOutput> => {
      assert.strictEqual(
        command,
        `${objDumpPath} ${args.join(' ')} ${filePath}`
      );
      return {stdout: expectedOutput, stderr: ''};
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, expectedOutput);
  });

  test('Dump: Valid executable - release', async () => {
    const filePath = 'examples/build/macos/vector_release';
    const objDumpPath = '/usr/bin/objdump';
    const args = ['-d'];

    const expectedOutput = await fs.promises
      .readFile('examples/build/macos/vector_release.objdump')
      .then(data => data.toString());
    const executeStub = async (command: string): Promise<ExecOutput> => {
      assert.strictEqual(
        command,
        `${objDumpPath} ${args.join(' ')} ${filePath}`
      );
      return {stdout: expectedOutput, stderr: ''};
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, expectedOutput);
  });

  test('Dump: Valid object - debug', async () => {
    const filePath = 'examples/build/macos/mmul_debug.o';
    const objDumpPath = '/usr/bin/objdump';
    const args = ['-d', '-S'];

    const expectedOutput = await fs.promises
      .readFile('examples/build/macos/mmul_debug.objdump')
      .then(data => data.toString());
    const executeStub = async (command: string): Promise<ExecOutput> => {
      assert.strictEqual(
        command,
        `${objDumpPath} ${args.join(' ')} ${filePath}`
      );
      return {stdout: expectedOutput, stderr: ''};
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, expectedOutput);
  });

  test('Dump: Valid object - release', async () => {
    const filePath = 'examples/build/macos/mmul_release.o';
    const objDumpPath = '/usr/bin/objdump';
    const args = ['-d'];

    const expectedOutput = await fs.promises
      .readFile('examples/build/macos/mmul_release.objdump')
      .then(data => data.toString());
    const executeStub = async (command: string): Promise<ExecOutput> => {
      assert.strictEqual(
        command,
        `${objDumpPath} ${args.join(' ')} ${filePath}`
      );
      return {stdout: expectedOutput, stderr: ''};
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, expectedOutput);
  });

  test('Dump: Invalid file path', async () => {
    const filePath = 'examples/build/macos/invalidFile';
    const objDumpPath = '/usr/bin/objdump';
    const args = ['-d', '-S'];

    const errorMessage = 'Error running objDump command';
    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error(errorMessage);
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, 'ERROR');
  });

  test('Dump: Invalid argument', async () => {
    const filePath = 'examples/build/macos/vector_debug';
    const objDumpPath = '/usr/bin/objdump';
    const args = ['-d', '-S', '--invalid-arg'];

    const errorMessage = 'Error running objDump command';
    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error(errorMessage);
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, 'ERROR');
  });

  test('Dump: Invalid objdump path', async () => {
    const filePath = 'examples/build/macos/vector_debug';
    const objDumpPath = '/usr/invalidPath/objdump';
    const args = ['-d', '-S'];

    const errorMessage = 'Error running objDump command';
    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error(errorMessage);
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, 'ERROR');
  });

  test('Dump: Invalid objdump executable', async () => {
    const filePath = 'examples/build/macos/vector_debug';
    const objDumpPath = '/usr/bin/gcc';
    const args = ['-d', '-S'];

    const errorMessage = 'Error running objDump command';
    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error(errorMessage);
    };

    const objDumper = new ObjDumper(filePath, objDumpPath, args);
    const actualOutput = await objDumper.dump();

    assert.strictEqual(actualOutput, 'ERROR');
  });

  test('Binary Validator: Valid objdump binary', async () => {
    const objDumpPath = '/usr/bin/objdump';

    const expectedOutput = 'objdump [options] <input object files>';
    const executeStub = async (command: string): Promise<ExecOutput> => {
      assert.strictEqual(command, `${objDumpPath} --help`);
      return {stdout: expectedOutput, stderr: ''};
    };

    const actualResult = await isObjDumpBinary(objDumpPath);

    assert.strictEqual(actualResult, true);
  });

  test('Binary validator: Invalid objdump binary', async () => {
    const objDumpPath = '/usr/bin/gcc';

    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error('Command failed');
    };

    const actualResult = await isObjDumpBinary(objDumpPath);

    assert.strictEqual(actualResult, false);
  });

  test('Binary Validator: Invalid objdump path', async () => {
    const objDumpPath = '/usr/invalidPath/objdump';

    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error('Command failed');
    };

    const actualResult = await isObjDumpBinary(objDumpPath);

    assert.strictEqual(actualResult, false);
  });

  test('Version: Valid objdump binary', async () => {
    const objDumpPath = '/usr/bin/objdump';

    const expectedOutput = 'Apple LLVM version 16.0.0';
    const executeStub = async (command: string): Promise<ExecOutput> => {
      assert.strictEqual(command, `${objDumpPath} --version`);
      return {stdout: expectedOutput, stderr: ''};
    };

    const actualResult = await getObjDumpVersion(objDumpPath);

    assert.strictEqual(actualResult, expectedOutput);
  });

  test('Version: Invalid objdump binary', async () => {
    const objDumpPath = '/usr/bin/gcc';

    const errorMessage = 'Error getting objdump version';
    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error(errorMessage);
    };

    const actualResult = await getObjDumpVersion(objDumpPath);

    assert.strictEqual(actualResult, 'ERROR');
  });

  test('Version: Invalid objdump path', async () => {
    const objDumpPath = '/usr/invalidPath/objdump';

    const errorMessage = 'Error getting objdump version';
    const executeStub = async (): Promise<ExecOutput> => {
      throw new Error(errorMessage);
    };

    const actualResult = await getObjDumpVersion(objDumpPath);

    assert.strictEqual(actualResult, 'ERROR');
  });
});
