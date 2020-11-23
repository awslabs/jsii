import * as childProcess from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import * as path from 'path';
import * as vm from 'vm';

import { api, Kernel } from '../lib';
import {
  Callback,
  ObjRef,
  TOKEN_REF,
  TOKEN_INTERFACES,
  TOKEN_MAP,
  WireStruct,
  TOKEN_STRUCT,
} from '../lib/api';
import { closeRecording, recordInteraction } from './recording';

/* eslint-disable require-atomic-updates */

// extract versions of fixtures
// eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
const calcBaseVersion = require('@scope/jsii-calc-base/package.json').version.replace(
  /\+.+$/,
  '',
);
// eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
const calcLibVersion = require('@scope/jsii-calc-lib/package.json').version.replace(
  /\+.+$/,
  '',
);
// eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
const calcVersion = require('jsii-calc/package.json').version.replace(
  /\+.+$/,
  '',
);

// Do this so that regexes stringify nicely in approximate tests
(RegExp.prototype as any).toJSON = function toJSON() {
  return this.source;
};

process.setMaxListeners(9999); // since every kernel instance adds an `on('exit')` handler.

process.on('unhandledRejection', (e) => {
  console.error((e as Error).stack);
  process.exit(1);
});

jest.setTimeout(60_000);

const recordingOutput = process.env.JSII_RECORD;
if (recordingOutput) {
  fs.mkdirpSync(recordingOutput);
  console.error(`JSII_RECORD=${recordingOutput}`);
}

function defineTest(
  name: string,
  method: (sandbox: Kernel) => Promise<any> | any,
  testFunc = test,
) {
  const recording = name.replace(/[^A-Za-z]/g, '_');

  testFunc(name, async () => {
    const kernel = await createCalculatorSandbox(recording);
    await method(kernel);
    return closeRecording(kernel);
  });
}

defineTest.skip = function (
  name: string,
  method: (sandbox: Kernel) => Promise<any> | any,
) {
  return defineTest(name, method, test.skip);
};

// Note: this test asserts file permissions, which work differently on Windows, so we skip it there
(process.platform === 'win32' ? test.skip : test)(
  'load preserves file permissions',
  async () => {
    // Changing the umask to 077 (which would neutralize group/other permissions)
    const originalUmask = process.umask(0o077);

    try {
      const kernel = await createCalculatorSandbox(
        'load_preserves_file_permissions',
      );

      const result = kernel.sinvoke({
        fqn: 'jsii-calc.UmaskCheck',
        method: 'mode',
      });
      expect(result.result).toBe(0o644);

      return await closeRecording(kernel);
    } finally {
      // Restore the original umask
      process.umask(originalUmask);
    }
  },
);

defineTest('stats() return sandbox statistics', (sandbox) => {
  const stats = sandbox.stats({});
  expect(stats.objectCount).toBe(0);

  for (let i = 0; i < 100; ++i) {
    sandbox.create({ fqn: '@scope/jsii-calc-lib.Number', args: [i] });
  }

  expect(sandbox.stats({}).objectCount).toBe(100);
});

defineTest('deleteObject will remove the reference', (sandbox) => {
  const objects = new Array<any>();

  for (let i = 0; i < 100; ++i) {
    objects.push(
      sandbox.create({ fqn: '@scope/jsii-calc-lib.Number', args: [i] }),
    );
  }

  expect(sandbox.stats({}).objectCount).toBe(100);

  for (let i = 0; i < 50; ++i) {
    sandbox.del({ objref: objects[i] });
  }

  expect(sandbox.stats({}).objectCount).toBe(50);

  expect(() =>
    sandbox.get({ objref: objects[10], property: 'value' }),
  ).toThrow();
});

defineTest('in/out primitive types', (sandbox) => {
  const alltypes = sandbox.create({ fqn: 'jsii-calc.AllTypes', args: [] });

  sandbox.set({ objref: alltypes, property: 'booleanProperty', value: true });
  expect(
    sandbox.get({ objref: alltypes, property: 'booleanProperty' }).value,
  ).toBe(true);

  sandbox.set({ objref: alltypes, property: 'booleanProperty', value: false });
  expect(
    sandbox.get({ objref: alltypes, property: 'booleanProperty' }).value,
  ).toBe(false);

  sandbox.set({ objref: alltypes, property: 'stringProperty', value: 'hello' });
  expect(
    sandbox.get({ objref: alltypes, property: 'stringProperty' }).value,
  ).toBe('hello');

  sandbox.set({ objref: alltypes, property: 'numberProperty', value: 123 });
  expect(
    sandbox.get({ objref: alltypes, property: 'numberProperty' }).value,
  ).toBe(123);

  // in -> out for an ANY
  const num = sandbox.create({
    fqn: '@scope/jsii-calc-lib.Number',
    args: [444],
  });
  sandbox.set({ objref: alltypes, property: 'anyProperty', value: num });
  expect(
    sandbox.get({ objref: alltypes, property: 'anyProperty' }).value,
  ).toEqual(num);

  // out -> in for an ANY
  const ret = sandbox.invoke({ objref: alltypes, method: 'anyOut' }).result;
  sandbox.invoke({ objref: alltypes, method: 'anyIn', args: [ret] });
});

defineTest('in/out objects', (sandbox) => {
  const alltypes = sandbox.create({ fqn: 'jsii-calc.AllTypes' });

  const num = sandbox.create({
    fqn: '@scope/jsii-calc-lib.Number',
    args: [444],
  });
  sandbox.set({ objref: alltypes, property: 'anyProperty', value: num });
  expect(
    sandbox.get({ objref: alltypes, property: 'anyProperty' }).value,
  ).toEqual(num);
});

defineTest('in/out collections', (sandbox) => {
  const alltypes = sandbox.create({ fqn: 'jsii-calc.AllTypes', args: [] });

  const array = ['1', '2', '3', '4'];
  sandbox.set({ objref: alltypes, property: 'arrayProperty', value: array });
  expect(
    sandbox.get({ objref: alltypes, property: 'arrayProperty' }).value,
  ).toEqual(array);

  const num = create(sandbox, '@scope/jsii-calc-lib.Number');

  const map = {
    a: num(12),
    b: num(33),
    c: num(33),
    d: num(123),
  };

  sandbox.set({
    objref: alltypes,
    property: 'mapProperty',
    value: { [TOKEN_MAP]: map },
  });
  expect(
    sandbox.get({ objref: alltypes, property: 'mapProperty' }).value[TOKEN_MAP],
  ).toEqual(map);
});

defineTest('in/out date values', (sandbox) => {
  const alltypes = sandbox.create({ fqn: 'jsii-calc.AllTypes' });

  const date = new Date('2018-01-18T00:00:32.347Z');
  sandbox.set({
    objref: alltypes,
    property: 'dateProperty',
    value: { [api.TOKEN_DATE]: date.toISOString() },
  });
  expect(
    sandbox.get({ objref: alltypes, property: 'dateProperty' }).value,
  ).toEqual({ [api.TOKEN_DATE]: '2018-01-18T00:00:32.347Z' });
});

defineTest('in/out enum values', (sandbox) => {
  const alltypes = sandbox.create({ fqn: 'jsii-calc.AllTypes' });

  sandbox.set({
    objref: alltypes,
    property: 'enumProperty',
    value: { [api.TOKEN_ENUM]: 'jsii-calc.AllTypesEnum/MY_ENUM_VALUE' },
  });
  expect(
    sandbox.get({ objref: alltypes, property: 'enumPropertyValue' }).value,
  ).toBe(0);
  sandbox.set({
    objref: alltypes,
    property: 'enumProperty',
    value: { [api.TOKEN_ENUM]: 'jsii-calc.AllTypesEnum/YOUR_ENUM_VALUE' },
  });
  expect(
    sandbox.get({ objref: alltypes, property: 'enumPropertyValue' }).value,
  ).toBe(100);
  sandbox.set({
    objref: alltypes,
    property: 'enumProperty',
    value: { [api.TOKEN_ENUM]: 'jsii-calc.AllTypesEnum/THIS_IS_GREAT' },
  });
  expect(
    sandbox.get({ objref: alltypes, property: 'enumPropertyValue' }).value,
  ).toBe(101);
  expect(
    sandbox.get({ objref: alltypes, property: 'enumProperty' }).value,
  ).toEqual({ '$jsii.enum': 'jsii-calc.AllTypesEnum/THIS_IS_GREAT' });
});

describe('in/out json values', () => {
  defineTest('with a plain object', (sandbox) => {
    const allTypes = sandbox.create({ fqn: 'jsii-calc.AllTypes' });
    sandbox.set({
      objref: allTypes,
      property: 'jsonProperty',
      value: { foo: 'bar', baz: 1337 },
    });
    expect(
      sandbox.get({ objref: allTypes, property: 'jsonProperty' }).value,
    ).toEqual({ foo: 'bar', baz: 1337 });
  });
  defineTest('with a simple mapping', (sandbox) => {
    const allTypes = sandbox.create({ fqn: 'jsii-calc.AllTypes' });
    sandbox.set({
      objref: allTypes,
      property: 'jsonProperty',
      value: { [api.TOKEN_MAP]: { foo: 'bar', baz: 1337 } },
    });
    expect(
      sandbox.get({ objref: allTypes, property: 'jsonProperty' }).value,
    ).toEqual({ foo: 'bar', baz: 1337 });
  });
  defineTest('with a nested mapping', (sandbox) => {
    const allTypes = sandbox.create({ fqn: 'jsii-calc.AllTypes' });
    sandbox.set({
      objref: allTypes,
      property: 'jsonProperty',
      value: {
        [api.TOKEN_MAP]: {
          foo: 'bar',
          baz: { [api.TOKEN_MAP]: { bazinga: [null, 'Pickle Rick'] } },
        },
      },
    });
    expect(
      sandbox.get({ objref: allTypes, property: 'jsonProperty' }).value,
    ).toEqual({ foo: 'bar', baz: { bazinga: [null, 'Pickle Rick'] } });
  });
});

defineTest('enum values from @scoped packages awslabs/jsii#138', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.ReferenceEnumFromScopedPackage',
  });

  const value = sandbox.get({ objref, property: 'foo' });
  expect(value).toEqual({
    value: { '$jsii.enum': '@scope/jsii-calc-lib.EnumFromScopedModule/VALUE2' },
  });

  sandbox.set({
    objref,
    property: 'foo',
    value: { '$jsii.enum': '@scope/jsii-calc-lib.EnumFromScopedModule/VALUE1' },
  });
  const ret = sandbox.invoke({ objref, method: 'loadFoo' });
  expect(ret).toEqual({
    result: {
      '$jsii.enum': '@scope/jsii-calc-lib.EnumFromScopedModule/VALUE1',
    },
  });

  sandbox.invoke({
    objref,
    method: 'saveFoo',
    args: [
      { '$jsii.enum': '@scope/jsii-calc-lib.EnumFromScopedModule/VALUE2' },
    ],
  });
  const value2 = sandbox.get({ objref, property: 'foo' });
  expect(value2).toEqual({
    value: { '$jsii.enum': '@scope/jsii-calc-lib.EnumFromScopedModule/VALUE2' },
  });
});

defineTest('fails for invalid enum member name', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.ReferenceEnumFromScopedPackage',
  });

  expect(() => {
    sandbox.set({
      objref,
      property: 'foo',
      value: {
        '$jsii.enum': '@scope/jsii-calc-lib.EnumFromScopedModule/ValueX',
      },
    });
  }).toThrow(/No enum member named ValueX/);
});

defineTest('set for a non existing property', (sandbox) => {
  const obj = sandbox.create({ fqn: 'jsii-calc.SyncVirtualMethods' });
  expect(() =>
    sandbox.set({ objref: obj, property: 'idontexist', value: 'Foo' }),
  ).toThrow();
});

defineTest('set for a readonly property', (sandbox) => {
  const obj = sandbox.create({ fqn: 'jsii-calc.SyncVirtualMethods' });
  expect(() =>
    sandbox.set({ objref: obj, property: 'readonlyProperty', value: 'Foo' }),
  ).toThrow();
});

defineTest('create object with ctor overloads', (sandbox) => {
  sandbox.create({ fqn: 'jsii-calc.Calculator' });
  sandbox.create({
    fqn: 'jsii-calc.Calculator',
    args: [{ initialValue: 100 }],
  });
});

defineTest(
  'objects created inside the sandbox are returned with type info and new objid',
  (sandbox) => {
    const calc = sandbox.create({
      fqn: 'jsii-calc.Calculator',
      args: [{ initialValue: 100 }],
    });
    sandbox.invoke({ objref: calc, method: 'add', args: [50] });

    const add = sandbox.get({ objref: calc, property: 'curr' }).value;
    expect(sandbox.get({ objref: add, property: 'value' }).value).toBe(150);
  },
);

defineTest(
  'naming allows returns the module name for different languages',
  (sandbox) => {
    expect(sandbox.naming({ assembly: 'jsii-calc' }).naming).toEqual({
      dotnet: {
        iconUrl:
          'https://sdk-for-net.amazonwebservices.com/images/AWSLogo128x128.png',
        namespace: 'Amazon.JSII.Tests.CalculatorNamespace',
        packageId: 'Amazon.JSII.Tests.CalculatorPackageId',
      },
      go: {
        moduleName: 'github.com/aws-cdk/jsii/jsii-calc/go',
      },
      java: {
        package: 'software.amazon.jsii.tests.calculator',
        maven: {
          groupId: 'software.amazon.jsii.tests',
          artifactId: 'calculator',
        },
      },
      js: { npm: 'jsii-calc' },
      kotlin: {
        package: 'software.amazon.jsii.tests.kotlin.calculator',
        maven: {
          groupId: 'software.amazon.jsii.tests.kotlin',
          artifactId: 'calculator',
        },
      },
      python: {
        distName: 'jsii-calc',
        module: 'jsii_calc',
        classifiers: ['Test :: Classifier :: Is Dummy'],
      },
    });
    expect(sandbox.naming({ assembly: '@scope/jsii-calc-lib' }).naming).toEqual(
      {
        dotnet: {
          namespace: 'Amazon.JSII.Tests.CalculatorNamespace.LibNamespace',
          packageId: 'Amazon.JSII.Tests.CalculatorPackageId.LibPackageId',
          versionSuffix: '-devpreview',
        },
        go: {
          moduleName: 'github.com/aws-cdk/jsii/jsii-calc/go',
        },
        java: {
          package: 'software.amazon.jsii.tests.calculator.lib',
          maven: {
            groupId: 'software.amazon.jsii.tests',
            artifactId: 'calculator-lib',
            versionSuffix: '.DEVPREVIEW',
          },
        },
        js: { npm: '@scope/jsii-calc-lib' },
        kotlin: {
          package: 'software.amazon.jsii.tests.kotlin.calculator.lib',
          maven: {
            groupId: 'software.amazon.jsii.tests.kotlin',
            artifactId: 'calculator-lib',
            versionSuffix: '.DEVPREVIEW',
          },
        },
        python: {
          distName: 'scope.jsii-calc-lib',
          module: 'scope.jsii_calc_lib',
        },
      },
    );
  },
);

defineTest('collection of objects', (sandbox) => {
  const sum = sandbox.create({ fqn: 'jsii-calc.Sum' });

  const n1 = sandbox.create({ fqn: '@scope/jsii-calc-lib.Number', args: [10] });
  const n2 = sandbox.create({ fqn: '@scope/jsii-calc-lib.Number', args: [4] });
  const n3 = sandbox.create({ fqn: 'jsii-calc.Power', args: [n1, n2] });

  sandbox.set({ objref: sum, property: 'parts', value: [n1, n2, n3] });

  const parts = sandbox.get({ objref: sum, property: 'parts' }).value;
  expect(sandbox.get({ objref: parts[0], property: 'value' }).value).toBe(10);
  expect(sandbox.get({ objref: parts[1], property: 'value' }).value).toBe(4);
  expect(sandbox.get({ objref: parts[2], property: 'value' }).value).toBe(
    Math.pow(10, 4),
  );

  const expr = sandbox.get({ objref: sum, property: 'expression' }).value;
  expect(sandbox.invoke({ objref: expr, method: 'toString' }).result).toBe(
    '(((0 + 10) + 4) + ((((1 * 10) * 10) * 10) * 10))',
  );
  expect(sandbox.get({ objref: expr, property: 'value' }).value).toBe(10014);
});

defineTest('class not found', (sandbox) => {
  expect(() => sandbox.create({ fqn: 'NotFound', args: [] })).toThrow();
});

defineTest(
  'type-checking: method and property names are validated against class and base classes',
  (sandbox) => {
    const obj = sandbox.create({ fqn: 'jsii-calc.Calculator' });

    sandbox.get({ objref: obj, property: 'stringStyle' }); // property from CompositeOperation
    sandbox.get({ objref: obj, property: 'value' }); // property from Value
    sandbox.get({ objref: obj, property: 'curr' }); // property from Calculator

    sandbox.invoke({ objref: obj, method: 'typeName' }); // method from Value
    sandbox.invoke({ objref: obj, method: 'add', args: [1] }); // method from Calculator

    expect(() => sandbox.get({ objref: obj, property: 'notFound' })).toThrow();
    expect(() =>
      sandbox.invoke({ objref: obj, method: 'boo', args: [] }),
    ).toThrow();
  },
);

defineTest('type-checking; module not found', (sandbox) => {
  expect(() => sandbox.create({ fqn: 'jsii$boo.Foo' })).toThrow(
    /Module 'jsii\$boo' not found/,
  );
});

defineTest('type-checking: type not found', (sandbox) => {
  expect(() => sandbox.create({ fqn: 'jsii-calc.Unknown' })).toThrow(
    /Type 'jsii-calc.Unknown' not found/,
  );
});

defineTest(
  'type-checking: try to create an object from a non-class type',
  (sandbox) => {
    expect(() => sandbox.create({ fqn: 'jsii-calc.AllTypesEnum' })).toThrow(
      /Unexpected FQN kind/,
    );
  },
);

defineTest(
  'type-checking: argument count in methods and initializers',
  (sandbox) => {
    // ctor has one optional argument
    sandbox.create({ fqn: 'jsii-calc.Calculator' });
    sandbox.create({ fqn: 'jsii-calc.Calculator', args: [{}] });

    // but we expect an error if more arguments are passed
    expect(() =>
      sandbox.create({ fqn: 'jsii-calc.Calculator', args: [1, 2, 3] }),
    ).toThrow(/Too many arguments/);
    expect(() =>
      sandbox.create({ fqn: 'jsii-calc.Calculator', args: [1, 2, 3, 4] }),
    ).toThrow(/Too many arguments/);

    expect(() => sandbox.create({ fqn: 'jsii-calc.Add', args: [] })).toThrow(
      /Not enough arguments/,
    );
    expect(() => sandbox.create({ fqn: 'jsii-calc.Add', args: [1] })).toThrow(
      /Not enough arguments/,
    );

    const obj = sandbox.create({ fqn: 'jsii-calc.RuntimeTypeChecking' });
    expect(() =>
      sandbox.invoke({
        objref: obj,
        method: 'methodWithOptionalArguments',
        args: [],
      }),
    ).toThrow(/Not enough arguments/);
    expect(() =>
      sandbox.invoke({
        objref: obj,
        method: 'methodWithOptionalArguments',
        args: [1],
      }),
    ).toThrow(/Not enough arguments/);
    sandbox.invoke({
      objref: obj,
      method: 'methodWithOptionalArguments',
      args: [1, 'hello'],
    });
    sandbox.invoke({
      objref: obj,
      method: 'methodWithOptionalArguments',
      args: [1, 'hello', { [api.TOKEN_DATE]: new Date().toISOString() }],
    });
    expect(() =>
      sandbox.invoke({
        objref: obj,
        method: 'methodWithOptionalArguments',
        args: [
          1,
          'hello',
          { [api.TOKEN_DATE]: new Date().toISOString() },
          'too much',
        ],
      }),
    ).toThrow(/Too many arguments/);
  },
);

defineTest(
  'verify object literals are converted to real classes',
  (sandbox) => {
    const obj = sandbox.create({ fqn: 'jsii-calc.JSObjectLiteralToNative' });
    const obj2 = sandbox.invoke({ objref: obj, method: 'returnLiteral' })
      .result;

    expect(obj2[api.TOKEN_REF]).toBeTruthy(); // verify that we received a ref as a result;

    const objid: string = obj2[api.TOKEN_REF];
    expect(
      objid.startsWith('jsii-calc.JSObjectLiteralToNativeClass@'),
      `${objid} does not have the intended prefix`,
    ).toBeTruthy(); // verify the type of the returned object'
  },
);

defineTest(
  'get a property from an type that only has base class properties',
  (sandbox) => {
    const obj = sandbox.create({
      fqn: 'jsii-calc.DerivedClassHasNoProperties.Derived',
    });
    sandbox.set({ objref: obj, property: 'prop', value: 'hi' });
    expect(sandbox.get({ objref: obj, property: 'prop' }).value).toBe('hi');
  },
);

defineTest(
  'async overrides: ignores overrides for unknown methods (to allow derived class to just pass all local method names)',
  (sandbox) => {
    sandbox.create({
      fqn: 'jsii-calc.AsyncVirtualMethods',
      overrides: [{ method: 'notFound' }],
    });
  },
);

defineTest('async overrides: override a method', async (sandbox) => {
  // first call without an override and expect pendingCallbacks to return
  // an empty array.
  const obj1 = sandbox.create({ fqn: 'jsii-calc.AsyncVirtualMethods' });

  async function callWithOverride(overrideCallback: (x: number) => number) {
    const promise1 = sandbox.begin({ objref: obj1, method: 'callMe' });
    expect(sandbox.callbacks().callbacks.length).toBe(0);
    const result1 = (await sandbox.end(promise1)).result;
    expect(result1).toBe(128);

    // now add an override and complete it with a some value.
    const obj = sandbox.create({
      fqn: 'jsii-calc.AsyncVirtualMethods',
      overrides: [{ method: 'overrideMe', cookie: 'myCookie' }],
    });
    const promise2 = sandbox.begin({ objref: obj, method: 'callMe' });
    const callbacks = sandbox.callbacks().callbacks;
    expect(callbacks.length).toBe(1);
    const cb = callbacks[0];
    expect(cb.invoke).toBeTruthy();
    expect(cb.invoke!.objref).toEqual(obj);
    expect(cb.invoke!.method).toBe('overrideMe');
    expect(cb.cookie).toBe('myCookie');
    expect(cb.invoke!.args).toEqual([10]);

    // calling pendingCallbacks again will return zero results
    // since all callbacks are moved to "waiting" state
    expect(sandbox.callbacks().callbacks.length).toBe(0);

    // call the override
    let callbackResult;
    let callbackError;
    try {
      callbackResult = overrideCallback(cb.invoke!.args![0]);
    } catch (e) {
      callbackError = e.message;
    }

    // complete the callback with a successful return value of 600
    sandbox.complete({
      cbid: cb.cbid,
      err: callbackError,
      result: callbackResult,
    });

    // await for the promise and verify that the completion was successfully
    // conveyed from the callback.
    return (await sandbox.end(promise2)).result;
  }

  expect(await callWithOverride((_) => 600)).toBe(608);
  expect(await callWithOverride((x) => 2 * x)).toBe(28);

  // override throws
  return expect(
    callWithOverride((_) => {
      throw new Error('Bla');
    }),
  ).rejects.toThrow('Bla');
});

defineTest(
  'async overrides: directly call a method with an override from native code should invoke the "super.method" since it can only be done by the derived class',
  async (sandbox) => {
    const obj = sandbox.create({
      fqn: 'jsii-calc.AsyncVirtualMethods',
      overrides: [{ method: 'overrideMe', cookie: 'myCookie' }],
    });
    const promise = sandbox.begin({
      objref: obj,
      method: 'overrideMe',
      args: [12],
    });

    // no callbacks should be pending, since this should invoke "super"
    expect(sandbox.callbacks().callbacks.length).toBe(0);
    expect((await sandbox.end(promise)).result).toBe(144);
  },
);

defineTest('async overrides: two overrides', async (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.AsyncVirtualMethods',
    overrides: [
      { method: 'overrideMeToo', cookie: 'cookie1' },
      { method: 'overrideMe', cookie: 'cookie2' },
    ],
  });

  const promise = sandbox.begin({ objref: obj, method: 'callMe' });

  const callbacks1 = sandbox.callbacks();
  expect(callbacks1.callbacks.length).toBe(1);

  sandbox.complete({ cbid: callbacks1.callbacks[0].cbid, result: 666 });
  await processPendingPromises(sandbox); // processing next promise

  const callbacks2 = sandbox.callbacks();
  expect(callbacks2.callbacks.length).toBe(1);

  sandbox.complete({ cbid: callbacks2.callbacks[0].cbid, result: 101 });
  await processPendingPromises(sandbox);

  const result = await sandbox.end({ promiseid: promise.promiseid });
  expect(result.result).toBe(775);
});

/**
 * This test simulates a sitation where an async method is called, which invokes
 * an async override in return, but the override's promise is not called synchronously
 * but rather within the "next tick". This can happen (at the discression of the runtime
 * and we should verify that the @jsii/runtime (or any runtime for that matter) "processes"
 * promises after a "begin" invocation in order to make sure any callbacks are queued.
 *
 * This is also relevant immediate after a "complete" invocation, which fulfills an async
 * promise and may subsequently queue more callbacks before one can "end" the original
 * async request.
 *
 * Yes, this is hairy.
 *
 * host.ts#93 is where this is implemented in the runtime.
 */
defineTest(
  'async overrides - process promises after "begin"',
  async (sandbox) => {
    const obj = sandbox.create({
      fqn: 'jsii-calc.AsyncVirtualMethods',
      overrides: [
        { method: 'overrideMe', cookie: 'cookie2' },
        { method: 'overrideMeToo' },
      ],
    });

    const p1 = sandbox.begin({ objref: obj, method: 'callMeDoublePromise' });

    // this is needed in order to cycle through another event loop so
    // that promises that are lazily called will be processed (nothing ensures
    // that the promise callback will be invokes synchronously).
    await processPendingPromises(sandbox);

    const callbacks1 = sandbox.callbacks();

    expect(callbacks1.callbacks.length).toBe(1);

    // --------------- start of "override" execution

    // we simulate the situation where the override invokes another async override

    // call a sync method (just for fun)
    const out = sandbox.invoke({ objref: obj, method: 'dontOverrideMe' });
    expect(out).toEqual({ result: 8 });

    // call another overridden async method
    const p2 = sandbox.begin({ objref: obj, method: 'callMe2' });

    // we should get a a callback to overrideMe2
    const callback2 = sandbox.callbacks();
    expect(callback2.callbacks.length).toBe(1);
    expect(callback2.callbacks[0].invoke!.method).toBe('overrideMeToo');

    // complete the inner callback
    sandbox.complete({ cbid: callback2.callbacks[0].cbid, result: 9999 });

    // fetch it
    expect(await sandbox.end({ promiseid: p2.promiseid })).toEqual({
      result: 9999,
    });

    // no more callbacks
    expect(sandbox.callbacks()).toEqual({ callbacks: [] });

    // now complete the outer callback
    sandbox.complete({ cbid: callbacks1.callbacks[0].cbid, result: 8888 });

    // required: process pending promises so that we will get the next one in the callbacks list
    await processPendingPromises(sandbox);

    // ------ end of execution of "overrideMe"

    // now we expect 'overrideMeToo' to be called back
    const cb3 = sandbox.callbacks();
    expect(cb3.callbacks.length).toBe(1);
    expect(cb3.callbacks[0].invoke!.method).toBe('overrideMeToo');

    // complete it
    sandbox.complete({ cbid: cb3.callbacks[0].cbid, result: -20 });

    // no more callbacks
    const cb4 = sandbox.callbacks();
    expect(cb4.callbacks.length).toBe(0);

    const result = await sandbox.end({ promiseid: p1.promiseid });
    expect(result.result).toBe(8876);
  },
);

function processPendingPromises(sandbox: Kernel) {
  return vm.runInContext(
    'new Promise(done => setImmediate(done));',
    (sandbox as any).sandbox,
  );
}

defineTest('sync overrides', async (sandbox) => {
  const pre = sandbox.create({ fqn: 'jsii-calc.SyncVirtualMethods' });

  // without override
  expect(sandbox.invoke({ objref: pre, method: 'callerIsMethod' }).result).toBe(
    20,
  );
  expect(sandbox.get({ objref: pre, property: 'callerIsProperty' }).value).toBe(
    20,
  );
  const p = sandbox.begin({ objref: pre, method: 'callerIsAsync' });
  expect((await sandbox.end({ promiseid: p.promiseid })).result).toBe(20);

  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    expect(callback.cookie).toBe('myCookie');
    expect(callback.invoke!.objref[TOKEN_REF]).toMatch(
      /jsii-calc\.SyncVirtualMethods/,
    );
    expect(callback.invoke!.method).toBe('virtualMethod');
    expect(callback.invoke!.args![0]).toBe(10);

    // to make things a bit more interesting, let's interact with a jsii object
    // from within the callback
    const lhs = sandbox.create({
      fqn: '@scope/jsii-calc-lib.Number',
      args: [callback.invoke!.args![0]],
    });
    const rhs = sandbox.create({
      fqn: '@scope/jsii-calc-lib.Number',
      args: [12],
    });
    const add = sandbox.create({ fqn: 'jsii-calc.Add', args: [lhs, rhs] });
    return sandbox.get({ objref: add, property: 'value' }).value;
  });

  // now make the same set of calls, and you will notice that the results are affected by the override.
  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ method: 'virtualMethod', cookie: 'myCookie' }],
  });
  expect(sandbox.invoke({ objref: obj, method: 'callerIsMethod' }).result).toBe(
    22,
  );
  expect(sandbox.get({ objref: obj, property: 'callerIsProperty' }).value).toBe(
    22,
  );

  // verify callbacks can also be called by setters.
  let called = false;
  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    expect(callback.invoke!.args![0]).toBe(999);
    called = true;
    return callback.invoke!.args![0];
  });

  sandbox.set({ objref: obj, property: 'callerIsProperty', value: 999 });
  expect(called).toBeTruthy();
});

defineTest('sync overrides with async caller', async (sandbox) => {
  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    expect(callback.cookie).toBe('myCookie');
    expect(callback.invoke!.objref[TOKEN_REF]).toMatch(
      /jsii-calc\.SyncVirtualMethods/,
    );
    expect(callback.invoke!.method).toBe('virtualMethod');
    expect(callback.invoke!.args![0]).toBe(10);

    // to make things a bit more interesting, let's interact with a jsii object
    // from within the callback
    const lhs = sandbox.create({
      fqn: '@scope/jsii-calc-lib.Number',
      args: [callback.invoke!.args![0]],
    });
    const rhs = sandbox.create({
      fqn: '@scope/jsii-calc-lib.Number',
      args: [12],
    });
    const add = sandbox.create({ fqn: 'jsii-calc.Add', args: [lhs, rhs] });
    return sandbox.get({ objref: add, property: 'value' }).value;
  });

  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ method: 'virtualMethod', cookie: 'myCookie' }],
  });
  const p2 = sandbox.begin({ objref: obj, method: 'callerIsAsync' });
  expect((await sandbox.end({ promiseid: p2.promiseid })).result).toBe(22);
});

defineTest('sync overrides: properties - readwrite', (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ property: 'theProperty', cookie: 'myCookie1234' }],
  });

  let setValue;
  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    expect(callback.cookie).toBe('myCookie1234');
    if (callback.get) {
      expect(callback.get.property).toBe('theProperty');
      return 'override applied';
    } else if (callback.set) {
      expect(callback.set.property).toBe('theProperty');
      setValue = callback.set.value;
      return undefined;
    }
    throw new Error('Invalid callback. Expected get/set');
  });

  const value = sandbox.invoke({
    objref: obj,
    method: 'retrieveValueOfTheProperty',
  });
  expect(value).toEqual({ result: 'override applied' });

  // make sure we can still set the property
  sandbox.invoke({
    objref: obj,
    method: 'modifyValueOfTheProperty',
    args: ['1234'],
  });
  expect(setValue).toBe('1234');
});

defineTest(
  'sync overrides: properties - readwrite (backed by functions)',
  (sandbox) => {
    const obj = sandbox.create({
      fqn: 'jsii-calc.SyncVirtualMethods',
      overrides: [{ property: 'otherProperty', cookie: 'myCookie1234' }],
    });

    let setValue;
    sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
      expect(callback.cookie).toBe('myCookie1234');
      if (callback.get) {
        expect(callback.get.property).toBe('otherProperty');
        return 'override applied for otherProperty';
      } else if (callback.set) {
        expect(callback.set.property).toBe('otherProperty');
        setValue = callback.set.value;
        return undefined;
      }
      throw new Error('Invalid callback. Expected get/set');
    });

    const value = sandbox.invoke({
      objref: obj,
      method: 'retrieveOtherProperty',
    });
    expect(value).toEqual({ result: 'override applied for otherProperty' });

    // make sure we can still set the property
    sandbox.invoke({
      objref: obj,
      method: 'modifyOtherProperty',
      args: ['778877'],
    });
    expect(setValue).toBe('778877');
  },
);

defineTest(
  'sync overrides: duplicate overrides for the same property',
  (sandbox) => {
    expect(() =>
      sandbox.create({
        fqn: 'jsii-calc.SyncVirtualMethods',
        overrides: [
          { property: 'otherProperty', cookie: 'myCookie1234' },
          { property: 'otherProperty', cookie: 'yourCookie' },
        ],
      }),
    ).toThrow();
  },
);

defineTest('sync overrides: properties - readonly', (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ property: 'readonlyProperty', cookie: 'myCookie1234' }],
  });

  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    expect(callback.cookie).toBe('myCookie1234');
    expect(callback.get).toBeTruthy();
    expect(callback.get!.property).toBe('readonlyProperty');
    return 'override for readonly property applied';
  });

  const value = sandbox.invoke({
    objref: obj,
    method: 'retrieveReadOnlyProperty',
  });
  expect(value).toEqual({ result: 'override for readonly property applied' });

  // can't set the value of a readonly property, dah!
  expect(() =>
    sandbox.set({ objref: obj, property: 'readonlyProperty', value: 1234 }),
  ).toThrow();
});

defineTest('sync overrides: properties - get calls super', (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ property: 'theProperty' }],
  });

  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    expect(callback.get!.property).toBe('theProperty');
    const superValue = sandbox.get({ objref: obj, property: 'theProperty' });
    return `override, super=${superValue.value}`;
  });

  const value = sandbox.invoke({
    objref: obj,
    method: 'retrieveValueOfTheProperty',
  });
  expect(value).toEqual({ result: 'override, super=initial value' });
});

defineTest('sync overrides: properties - set calls super', (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ property: 'theProperty' }],
  });

  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    if (callback.get) {
      return sandbox.get({ objref: obj, property: 'theProperty' }).value;
    }

    if (callback.set) {
      return sandbox.set({
        objref: obj,
        property: 'theProperty',
        value: `set by override: ${callback.set.value}`,
      });
    }

    throw new Error(`Unexpected callback request: ${JSON.stringify(callback)}`);
  });

  sandbox.invoke({
    objref: obj,
    method: 'modifyValueOfTheProperty',
    args: ['new_value'],
  });
  const value = sandbox.invoke({
    objref: obj,
    method: 'retrieveValueOfTheProperty',
  });
  expect(value).toEqual({ result: 'set by override: new_value' });
});

defineTest(
  'sync overrides: properties - verify keys are enumerable',
  (sandbox) => {
    const obj = sandbox.create({
      fqn: 'Object',
      overrides: [{ property: 'foo' }, { property: 'readOnlyString' }],
    });
    const reader = sandbox.create({
      fqn: 'jsii-calc.UsesInterfaceWithProperties',
      args: [obj],
    });

    sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
      if (callback.get?.property === 'foo') {
        return 999;
      }

      if (callback.get?.property === 'readOnlyString') {
        return 'STR';
      }

      throw new Error('Unexpected callback');
    });

    const result = sandbox.invoke({
      objref: reader,
      method: 'readStringAndNumber',
      args: [obj],
    });
    expect(result).toEqual({
      result: 'base=STR child=999 keys=[foo,readOnlyString]',
    });
  },
);

defineTest('sync overrides: returns an object', (sandbox) => {
  const returnsNumber = sandbox.create({
    fqn: 'Object',
    overrides: [{ method: 'obtainNumber' }, { property: 'numberProp' }],
  });

  const obj = sandbox.create({ fqn: 'jsii-calc.OverrideReturnsObject' });
  const number100 = sandbox.create({
    fqn: '@scope/jsii-calc-lib.Number',
    args: [100],
  });
  const number500 = sandbox.create({
    fqn: '@scope/jsii-calc-lib.Number',
    args: [500],
  });

  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    if (callback.invoke?.method === 'obtainNumber') {
      return number100;
    }

    if (callback.get?.property === 'numberProp') {
      return number500;
    }

    throw new Error(`Unexpected callback:${JSON.stringify(callback)}`);
  });

  const ret = sandbox.invoke({
    objref: obj,
    method: 'test',
    args: [returnsNumber],
  });
  expect(ret).toEqual({ result: 100 * 2 + 500 * 2 });
});

defineTest('fail to begin async from sync - method', (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.SyncVirtualMethods',
    overrides: [{ method: 'virtualMethod', cookie: 'myCookie' }],
  });

  let called = 0;

  sandbox.callbackHandler = makeSyncCallbackHandler((_) => {
    const innerObj = sandbox.create({ fqn: 'jsii-calc.AsyncVirtualMethods' });
    expect(() =>
      sandbox.begin({ objref: innerObj, method: 'callMe' }),
    ).toThrow();
    called++;

    return 42; // Need a valid return value
  });

  sandbox.invoke({ objref: obj, method: 'callerIsMethod' });
  expect(called).toBe(1);

  sandbox.get({ objref: obj, property: 'callerIsProperty' });
  expect(called).toBe(2);

  sandbox.set({ objref: obj, property: 'callerIsProperty', value: 33 });
  expect(called).toBe(3);
});

defineTest(
  'the "Object" FQN can be used to allow creating empty objects with overrides which comply with an interface',
  (sandbox) => {
    const obj = sandbox.create({ fqn: 'jsii-calc.Polymorphism' });
    const friendly = sandbox.create({
      fqn: 'Object',
      overrides: [{ method: 'hello' }],
    });
    sandbox.callbackHandler = makeSyncCallbackHandler((_) => 'oh, hello');
    const ret = sandbox.invoke({
      objref: obj,
      method: 'sayHello',
      args: [friendly],
    });
    expect(ret.result).toBe('oh, oh, hello');
  },
);

defineTest(
  'literal objects can be returned when an interface is expected, and they will be adorned with jsii metadata so they can be interacted with',
  (sandbox) => {
    const obj = sandbox.create({
      fqn: 'jsii-calc.JSObjectLiteralForInterface',
    });
    const ret = sandbox.invoke({ objref: obj, method: 'giveMeFriendly' });

    expect(sandbox.invoke({ objref: ret.result, method: 'hello' })).toEqual({
      result: 'I am literally friendly!',
    });

    const ret2 = sandbox.invoke({
      objref: obj,
      method: 'giveMeFriendlyGenerator',
    });
    expect(sandbox.invoke({ objref: ret2.result, method: 'hello' })).toEqual({
      result: 'giveMeFriendlyGenerator',
    });
    expect(sandbox.invoke({ objref: ret2.result, method: 'next' })).toEqual({
      result: 42,
    });
  },
);

defineTest(
  'exceptions include a stack trace into the original source code',
  (sandbox) => {
    const obj = sandbox.create({ fqn: 'jsii-calc.Thrower' });
    expect(() => {
      try {
        sandbox.invoke({ objref: obj, method: 'throwError' });
      } catch (error) {
        const regexp = /^\s*at Thrower\.doThrowError \(.*jsii[-_]calc.*\/lib\/compliance\.ts:\d+:\d+\)$/m;
        expect(regexp.test(error.stack)).toBeTruthy(); // The stack trace includes the path to the original source file
        throw error;
      }
    }).toThrow();
  },
);

defineTest('variadic methods can be called', (sandbox) => {
  const obj = sandbox.create({ fqn: 'jsii-calc.VariadicMethod' });
  expect(
    sandbox.invoke({ objref: obj, method: 'asArray', args: [1, 2, 3, 4] })
      .result,
  ).toEqual([1, 2, 3, 4]);
});

defineTest('variadic methods can be called without any vararg', (sandbox) => {
  const obj = sandbox.create({
    fqn: 'jsii-calc.VariadicMethod',
    args: [1, 2, 3],
  });
  expect(
    sandbox.invoke({ objref: obj, method: 'asArray', args: [4] }).result,
  ).toEqual([1, 2, 3, 4]);
});

defineTest('static properties - get', (sandbox) => {
  const value = sandbox.sget({ fqn: 'jsii-calc.Statics', property: 'Foo' });
  expect(value).toEqual({ value: 'hello' });
});

defineTest('fails: static properties - set readonly', (sandbox) => {
  expect(() =>
    sandbox.sset({ fqn: 'jsii-calc.Statics', property: 'Foo', value: 123 }),
  ).toThrow();
});

defineTest('static properties - set', (sandbox) => {
  const defaultInstance = sandbox.sget({
    fqn: 'jsii-calc.Statics',
    property: 'instance',
  });
  expect(
    sandbox.get({ objref: defaultInstance.value, property: 'value' }),
  ).toEqual({ value: 'default' });

  const obj = sandbox.create({
    fqn: 'jsii-calc.Statics',
    args: ['MyInstance'],
  });
  sandbox.sset({ fqn: 'jsii-calc.Statics', property: 'instance', value: obj });

  const updatedInstance = sandbox.sget({
    fqn: 'jsii-calc.Statics',
    property: 'instance',
  });
  expect(
    sandbox.get({ objref: updatedInstance.value, property: 'value' }),
  ).toEqual({ value: 'MyInstance' });
});

defineTest('fails: static properties - get/set non-static', (sandbox) => {
  expect(() =>
    sandbox.sget({ fqn: 'jsii-calc.Statics', property: 'value' }),
  ).toThrow(/is not static/);
  expect(() =>
    sandbox.sset({ fqn: 'jsii-calc.Statics', property: 'value', value: 123 }),
  ).toThrow(/is not static/);
});

defineTest('fails: static properties - get/set not found', (sandbox) => {
  expect(() =>
    sandbox.sget({ fqn: 'jsii-calc.Statics', property: 'zoo' }),
  ).toThrow(/doesn't have a property/);
  expect(() =>
    sandbox.sset({ fqn: 'jsii-calc.Statics', property: 'bar', value: 123 }),
  ).toThrow(/doesn't have a property/);
});

defineTest('static methods', (sandbox) => {
  const result = sandbox.sinvoke({
    fqn: 'jsii-calc.Statics',
    method: 'staticMethod',
    args: ['Jsii'],
  });
  expect(result).toEqual({ result: 'hello ,Jsii!' });
});

defineTest('fails: static methods - not found', (sandbox) => {
  expect(() =>
    sandbox.sinvoke({
      fqn: 'jsii-calc.Statics',
      method: 'staticMethodNotFound',
      args: ['Jsii'],
    }),
  ).toThrow(/doesn't have a method/);
});

defineTest('fails: static methods - not static', (sandbox) => {
  expect(() =>
    sandbox.sinvoke({
      fqn: 'jsii-calc.Statics',
      method: 'justMethod',
      args: ['Jsii'],
    }),
  ).toThrow(/is not a static method/);
});

defineTest('loading a module twice idepotently succeeds', async (sandbox) => {
  sandbox.load({
    tarball: await preparePackage('jsii-calc', false),
    name: 'jsii-calc',
    version: calcVersion,
  });
});

defineTest(
  'fails if trying to load two different versions of the same module',
  async (sandbox) => {
    const tarball = await preparePackage('jsii-calc', false);
    return expect(() =>
      sandbox.load({ tarball, name: 'jsii-calc', version: '99.999.9' }),
    ).toThrow(
      /Multiple versions .+ and .+ of the package 'jsii-calc' cannot be loaded together/,
    );
  },
);

defineTest('node.js standard library', async (sandbox) => {
  const objref = sandbox.create({ fqn: 'jsii-calc.NodeStandardLibrary' });
  const promise = sandbox.begin({ objref, method: 'fsReadFile' });
  await processPendingPromises(sandbox);

  const output = await sandbox.end({ promiseid: promise.promiseid });
  expect(output).toEqual({ result: 'Hello, resource!' });
  expect(sandbox.invoke({ objref, method: 'fsReadFileSync' })).toEqual({
    result: 'Hello, resource! SYNC!',
  });

  const platform = sandbox.get({ objref, property: 'osPlatform' }).value;
  expect(platform?.length).toBeGreaterThan(0);

  expect(sandbox.invoke({ objref, method: 'cryptoSha256' })).toEqual({
    result: '6a2da20943931e9834fc12cfe5bb47bbd9ae43489a30726962b576f4e3993e50',
  });
});

// @see awslabs/jsii#248
defineTest('object literals are returned by reference', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.ClassWithMutableObjectLiteralProperty',
  });
  const property = sandbox.get({ objref, property: 'mutableObject' }).value;

  const newValue = 'Bazinga!1!';
  sandbox.set({ objref: property, property: 'value', value: newValue });

  expect(
    sandbox.get({
      objref: sandbox.get({ objref, property: 'mutableObject' }).value,
      property: 'value',
    }).value,
  ).toEqual(newValue);

  sandbox.del({ objref: property });
});

defineTest(
  'overrides: method instead of property with the same name',
  (sandbox) => {
    expect(() => {
      sandbox.create({
        fqn: 'jsii-calc.SyncVirtualMethods',
        overrides: [{ method: 'theProperty' }],
      });
    }).toThrow(/Trying to override property/);
  },
);

defineTest(
  'overrides: property instead of method with the same name',
  (sandbox) => {
    expect(() => {
      sandbox.create({
        fqn: 'jsii-calc.SyncVirtualMethods',
        overrides: [{ property: 'virtualMethod' }],
      });
    }).toThrow(/Trying to override method/);
  },
);

defineTest('overrides: skip overrides of private methods', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.DoNotOverridePrivates',
    overrides: [{ method: 'privateMethod' }],
  });

  sandbox.callbackHandler = makeSyncCallbackHandler((_) => {
    throw new Error('override callback should not be called');
  });

  const result = sandbox.invoke({ objref, method: 'privateMethodValue' });
  expect(result.result).toBe('privateMethod');
});

defineTest('overrides: skip overrides of private properties', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.DoNotOverridePrivates',
    overrides: [{ property: 'privateProperty' }],
  });

  sandbox.callbackHandler = makeSyncCallbackHandler((_) => {
    throw new Error('override callback should not be called');
  });

  const result = sandbox.invoke({ objref, method: 'privatePropertyValue' });
  expect(result.result).toBe('privateProperty');
});

defineTest('nulls are converted to undefined - ctor', (sandbox) => {
  sandbox.create({
    fqn: 'jsii-calc.NullShouldBeTreatedAsUndefined',
    args: ['foo', null],
  });
});

defineTest('nulls are converted to undefined - method arguments', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.NullShouldBeTreatedAsUndefined',
    args: ['foo'],
  });
  sandbox.invoke({ objref, method: 'giveMeUndefined', args: [null] });
});

defineTest('nulls are converted to undefined - inside objects', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.NullShouldBeTreatedAsUndefined',
    args: ['foo'],
  });
  sandbox.invoke({
    objref,
    method: 'giveMeUndefinedInsideAnObject',
    args: [
      {
        thisShouldBeUndefined: null,
        arrayWithThreeElementsAndUndefinedAsSecondArgument: [
          'one',
          null,
          'two',
        ],
      },
    ],
  });
});

defineTest('nulls are converted to undefined - properties', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.NullShouldBeTreatedAsUndefined',
    args: ['foo'],
  });
  sandbox.set({ objref, property: 'changeMeToUndefined', value: null });
  sandbox.invoke({ objref, method: 'verifyPropertyIsUndefined' });
});

defineTest('JSII_AGENT is undefined in node.js', (sandbox) => {
  expect(
    sandbox.sget({ fqn: 'jsii-calc.JsiiAgent', property: 'value' }).value,
  ).toBe(undefined);
});

defineTest('ObjRefs are labeled with the "most correct" type', (sandbox) => {
  typeMatches('makeClass', { [TOKEN_REF]: /^jsii-calc.InbetweenClass@/ });
  typeMatches('makeInterface', {
    [TOKEN_REF]: /^jsii-calc.InbetweenClass@/,
    [TOKEN_INTERFACES]: ['jsii-calc.IPublicInterface'],
  });
  typeMatches('makeInterface2', { [TOKEN_REF]: /^jsii-calc.InbetweenClass@/ });
  typeMatches('makeInterfaces', [
    {
      [TOKEN_REF]: /^jsii-calc.InbetweenClass@/,
      [TOKEN_INTERFACES]: ['jsii-calc.IPublicInterface'],
    },
  ]);
  typeMatches('hiddenInterface', {
    [TOKEN_REF]: /^Object@/,
    [TOKEN_INTERFACES]: ['jsii-calc.IPublicInterface'],
  });
  typeMatches('hiddenInterfaces', [
    {
      [TOKEN_REF]: /^Object@/,
      [TOKEN_INTERFACES]: ['jsii-calc.IPublicInterface'],
    },
  ]);
  typeMatches('hiddenSubInterfaces', [
    {
      [TOKEN_REF]: /^Object@/,
      [TOKEN_INTERFACES]: ['jsii-calc.IPublicInterface'],
    },
  ]);

  function typeMatches(staticMethod: string, typeSpec: any) {
    const ret = sandbox.sinvoke({
      fqn: 'jsii-calc.Constructors',
      method: staticMethod,
    }).result as api.ObjRef;

    expect(
      deepEqualWithRegex(ret, typeSpec),
      `Constructors.${staticMethod}() => ${JSON.stringify(
        ret,
      )}, does not match ${JSON.stringify(typeSpec)}`,
    ).toBeTruthy();
  }
});

/**
 * This is used to validate the ability to use `this` from within a static context.
 *
 * https://github.com/awslabs/aws-cdk/issues/2304
 */
defineTest('sinvoke allows access to the static context', (sandbox) => {
  const response = sandbox.sinvoke({
    fqn: 'jsii-calc.StaticContext',
    method: 'canAccessStaticContext',
  });
  expect(response.result).toBe(true);
});
defineTest('sget allows access to the static context', (sandbox) => {
  const response = sandbox.sget({
    fqn: 'jsii-calc.StaticContext',
    property: 'staticVariable',
  });
  expect(response.value).toBe(true);
});
defineTest('sset allows access to the static context', (sandbox) => {
  sandbox.sset({
    fqn: 'jsii-calc.StaticContext',
    property: 'staticVariable',
    value: false,
  });
  const response = sandbox.sget({
    fqn: 'jsii-calc.StaticContext',
    property: 'staticVariable',
  });
  expect(response.value).toBe(false);
});

/*

Test currently disabled because we don't have the infrastructure to make it pass.
https://github.com/aws/jsii/issues/399

defineTest('A single instance can be returned under two types', (sandbox) => {
    const singleInstanceTwoTypes = create(sandbox, 'jsii-calc.SingleInstanceTwoTypes')();

    typeMatches('interface1', { [TOKEN_REF]: /^jsii-calc.InbetweenClass@/ });
    typeMatches('interface2', { [TOKEN_REF]: /^jsii-calc.IPublicInterface@/ });

    function typeMatches(method: string, typeSpec: any) {
        const ret = sandbox.invoke({ objref: singleInstanceTwoTypes, method }).result as api.ObjRef;

        test.ok(deepEqualWithRegex(ret, typeSpec), `Constructors.${method}() => ${JSON.stringify(ret)}, does not match ${JSON.stringify(typeSpec)}`);
    }
});

*/

defineTest(
  'toSandbox: "null" in hash values send to JS should be treated as non-existing key',
  (sandbox) => {
    const input = { option1: null, option2: 'hello' };
    const option1Exists = sandbox.sinvoke({
      fqn: 'jsii-calc.EraseUndefinedHashValues',
      method: 'doesKeyExist',
      args: [input, 'option1'],
    });
    expect(option1Exists.result).toBe(false);

    const option2Exists = sandbox.sinvoke({
      fqn: 'jsii-calc.EraseUndefinedHashValues',
      method: 'doesKeyExist',
      args: [input, 'option2'],
    });
    expect(option2Exists.result).toBe(true);
  },
);

defineTest(
  'toSandbox: "undefined" in hash values sent to JS should be treated as non-existing key',
  (sandbox) => {
    const input = { option1: undefined, option2: 'hello' };
    const option1Exists = sandbox.sinvoke({
      fqn: 'jsii-calc.EraseUndefinedHashValues',
      method: 'doesKeyExist',
      args: [input, 'option1'],
    });
    expect(option1Exists.result).toBe(false);
    const option2Exists = sandbox.sinvoke({
      fqn: 'jsii-calc.EraseUndefinedHashValues',
      method: 'doesKeyExist',
      args: [input, 'option2'],
    });
    expect(option2Exists.result).toBe(true);
  },
);

defineTest('calculator can set and retrieve union properties', (sandbox) => {
  const calculator = create(sandbox, 'jsii-calc.Calculator')();

  const mul = create(sandbox, 'jsii-calc.Multiply');
  const num = create(sandbox, '@scope/jsii-calc-lib.Number');

  sandbox.set({
    objref: calculator,
    property: 'unionProperty',
    value: mul(num(9), num(3)),
  });

  const value = sandbox.invoke({ objref: calculator, method: 'readUnionValue' })
    .result;
  expect(27).toBe(value);

  const expression = sandbox.get({
    objref: calculator,
    property: 'unionProperty',
  }).value;
  expect(
    deepEqualWithRegex(expression, { [TOKEN_REF]: /^jsii-calc.Multiply@/ }),
  ).toBeTruthy();
});

defineTest('can set and retrieve union properties', (sandbox) => {
  const types = create(sandbox, 'jsii-calc.AllTypes')();
  const typesSet = set(sandbox, types);
  const typesGet = get(sandbox, types);
  const mul = create(sandbox, 'jsii-calc.Multiply');
  const num = create(sandbox, '@scope/jsii-calc-lib.Number');

  typesSet('unionProperty', 1234);
  expect(typesGet('unionProperty')).toBe(1234);

  typesSet('unionProperty', 'Hello');
  expect(typesGet('unionProperty')).toBe('Hello');

  typesSet('unionProperty', mul(num(2), num(12)));
  const mulObj = typesGet('unionProperty');
  expect(get(sandbox, mulObj)('value')).toBe(24);

  // Collections

  typesSet('unionMapProperty', {
    Foo: num(99),
  });

  typesSet('unionArrayProperty', [123, num(33)]);
  const unionArray = typesGet('unionArrayProperty');
  expect(get(sandbox, unionArray[1])('value')).toBe(33);
});

defineTest(
  'require presence of required properties -- top level',
  (sandbox) => {
    expect(() => {
      sandbox.sinvoke({
        fqn: 'jsii-calc.StructPassing',
        method: 'roundTrip',
        args: [123, { incomplete: true }],
      });
    }).toThrow(
      /Missing required properties for jsii-calc.TopLevelStruct: required, secondLevel/,
    );
  },
);

defineTest(
  'require presence of required properties -- deeper level',
  (sandbox) => {
    expect(() => {
      sandbox.sinvoke({
        fqn: 'jsii-calc.StructPassing',
        method: 'roundTrip',
        args: [
          123,
          {
            required: 'abc',
            secondLevel: { alsoIncomplete: true },
          },
        ],
      });
    }).toThrow(
      /Missing required properties for jsii-calc.SecondLevelStruct: deeperRequiredProp/,
    );
  },
);

defineTest('notice when an array is passed instead of varargs', (sandbox) => {
  expect(() => {
    sandbox.sinvoke({
      fqn: 'jsii-calc.StructPassing',
      method: 'howManyVarArgsDidIPass',
      args: [123, [{ required: 'abc', secondLevel: 6 }]],
    });
  }).toThrow(/Got an array where a jsii-calc.TopLevelStruct was expected/);
});

defineTest(
  'Object ID does not get re-allocated when the constructor passes "this" out',
  (sandbox) => {
    sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
      expect(callback.invoke?.method).toBe('consumePartiallyInitializedThis');
      expect(callback.invoke?.args).toEqual([
        {
          [api.TOKEN_REF]: 'jsii-calc.ConstructorPassesThisOut@10001',
        },
        {
          [api.TOKEN_DATE]: '1970-01-01T00:00:00.000Z',
        },
        {
          [api.TOKEN_ENUM]: 'jsii-calc.AllTypesEnum/THIS_IS_GREAT',
        },
      ]);
      return 'OK';
    });
    const reflector = sandbox.create({
      fqn: 'jsii-calc.PartiallyInitializedThisConsumer',
      overrides: [{ method: 'consumePartiallyInitializedThis' }],
    });
    expect(reflector[api.TOKEN_REF]).toBe(
      'jsii-calc.PartiallyInitializedThisConsumer@10000',
    );

    const classRef = sandbox.create({
      fqn: 'jsii-calc.ConstructorPassesThisOut',
      args: [reflector],
    });
    expect(classRef[api.TOKEN_REF]).toBe(
      'jsii-calc.ConstructorPassesThisOut@10001',
    );
  },
);

defineTest(
  'struct: empty object is turned to undefined by deserialization',
  (sandbox) => {
    const object = sandbox.create({
      fqn: 'jsii-calc.OptionalStructConsumer',
      args: [{}],
    });
    const result = sandbox.get({
      objref: object,
      property: 'parameterWasUndefined',
    });
    expect(result.value).toBeTruthy(); // The parameter was undefined within the constructor'
  },
);

defineTest('struct: non-empty object deserializes properly', (sandbox) => {
  const objref = sandbox.create({
    fqn: 'jsii-calc.OptionalStructConsumer',
    args: [{ field: 'foo' }],
  });
  const result = sandbox.get({ objref, property: 'parameterWasUndefined' });
  expect(result.value).toBeFalsy(); // The parameter was not undefined within the constructor'
  const field = sandbox.get({ objref, property: 'fieldValue' });
  expect(field.value).toBe('foo');
});

defineTest(
  'erased base: can receive an instance of private type',
  (sandbox) => {
    const objref = sandbox.sinvoke({
      fqn: 'jsii-calc.JSII417PublicBaseOfBase',
      method: 'makeInstance',
    });
    expect(objref.result).toEqual({
      [api.TOKEN_REF]: 'jsii-calc.JSII417PublicBaseOfBase@10000',
    });
  },
);

defineTest('deserialize a struct by reference', (sandbox) => {
  sandbox.callbackHandler = makeSyncCallbackHandler(() => 'xoxoxox');
  const objref = sandbox.create({
    fqn: 'Object',
    overrides: [{ property: 'field' }],
  });
  const consumer = sandbox.create({
    fqn: 'jsii-calc.OptionalStructConsumer',
    args: [objref],
  });
  const value = sandbox.get({ objref: consumer, property: 'fieldValue' });
  expect(value).toEqual({ value: 'xoxoxox' });
});

defineTest('correctly passes enum values across', (sandbox) => {
  const stringLike = sandbox.sinvoke({
    fqn: 'jsii-calc.EnumDispenser',
    method: 'randomStringLikeEnum',
  });
  expect(stringLike.result).toEqual({ '$jsii.enum': 'jsii-calc.StringEnum/B' });

  const integerLike = sandbox.sinvoke({
    fqn: 'jsii-calc.EnumDispenser',
    method: 'randomIntegerLikeEnum',
  });
  expect(integerLike.result).toEqual({
    '$jsii.enum': 'jsii-calc.AllTypesEnum/YOUR_ENUM_VALUE',
  });
});

defineTest('registers interfaces requested', (sandbox) => {
  const interfaces = [
    'jsii-calc.IReturnsNumber',
    'jsii-calc.IInterfaceWithOptionalMethodArguments',
  ];
  const objref = sandbox.create({ fqn: 'Object', interfaces });
  expect(objref).toEqual({
    [TOKEN_REF]: 'Object@10000',
    [TOKEN_INTERFACES]: interfaces.sort(),
  });
});

defineTest('retains the type of object literals', (sandbox) => {
  sandbox.callbackHandler = makeSyncCallbackHandler((cb) => {
    expect(cb.invoke?.method).toBe('provideAsInterface');
    expect(cb.invoke?.objref).toMatchObject({ [TOKEN_REF]: 'Object@10000' });
    const realObject = sandbox.create({
      fqn: 'jsii-calc.AnonymousImplementationProvider',
    });
    const { result } = sandbox.invoke({
      objref: realObject,
      method: 'provideAsInterface',
    });
    sandbox.del({ objref: realObject });
    return result;
  });

  const objref = sandbox.create({
    fqn: 'Object',
    interfaces: ['jsii-calc.IAnonymousImplementationProvider'],
    overrides: [{ method: 'provideAsInterface' }],
  });
  const result = sandbox.invoke({ objref, method: 'provideAsInterface' });
  expect(result).toEqual({
    result: {
      [TOKEN_REF]: 'jsii-calc.Implementation@10002',
      [TOKEN_INTERFACES]: ['jsii-calc.IAnonymouslyImplementMe'],
    },
  });
});

defineTest('correctly deserializes struct unions', (sandbox) => {
  const unionConsumer = 'jsii-calc.StructUnionConsumer';
  const structA0: WireStruct = {
    [TOKEN_STRUCT]: {
      fqn: 'jsii-calc.StructA',
      data: { requiredString: 'Present!', optionalString: 'Bazinga!' },
    },
  };
  const structA1: WireStruct = {
    [TOKEN_STRUCT]: {
      fqn: 'jsii-calc.StructA',
      data: { requiredString: 'Present!', optionalNumber: 1337 },
    },
  };
  const structB0: WireStruct = {
    [TOKEN_STRUCT]: {
      fqn: 'jsii-calc.StructB',
      data: { requiredString: 'Present!', optionalBoolean: true },
    },
  };
  const structB1: WireStruct = {
    [TOKEN_STRUCT]: {
      fqn: 'jsii-calc.StructB',
      data: { requiredString: 'Present!', optionalStructA: structA1 },
    },
  };

  for (const item of [structA0, structA1]) {
    expect(
      sandbox.sinvoke({ fqn: unionConsumer, method: 'isStructA', args: [item] })
        .result,
    ).toBe(true);
    expect(
      sandbox.sinvoke({ fqn: unionConsumer, method: 'isStructB', args: [item] })
        .result,
    ).toBe(false);
  }

  for (const item of [structB0, structB1]) {
    expect(
      sandbox.sinvoke({ fqn: unionConsumer, method: 'isStructA', args: [item] })
        .result,
    ).toBe(false);
    expect(
      sandbox.sinvoke({ fqn: unionConsumer, method: 'isStructB', args: [item] })
        .result,
    ).toBe(true);
  }
});

defineTest('ANY deserializer: decorated structs', (sandbox) => {
  const input = {
    '$jsii.struct': {
      fqn: 'jsii-calc.StructB',
      data: { requiredString: 'Bazinga!', optionalBoolean: false },
    },
  };
  expect(deserializeAny(sandbox, input)).toStrictEqual({
    requiredString: 'Bazinga!',
    optionalBoolean: false,
  });
});

defineTest('ANY deserializer: primitives', (sandbox) => {
  expect(deserializeAny(sandbox, -100)).toStrictEqual(-100);
  expect(deserializeAny(sandbox, 0)).toStrictEqual(0);
  expect(deserializeAny(sandbox, 1234)).toStrictEqual(1234);
  expect(deserializeAny(sandbox, 'hello')).toStrictEqual('hello');
  expect(deserializeAny(sandbox, '')).toStrictEqual('');
  expect(deserializeAny(sandbox, true)).toStrictEqual(true);
  expect(deserializeAny(sandbox, false)).toStrictEqual(false);
});

defineTest('ANY deserializer: array', (sandbox) => {
  expect(deserializeAny(sandbox, [1, 2, 3, 'four'])).toStrictEqual([
    1,
    2,
    3,
    'four',
  ]);
});

defineTest('ANY deserializer: undefined/null', (sandbox) => {
  expect(deserializeAny(sandbox, null)).toStrictEqual(undefined);
  expect(deserializeAny(sandbox, undefined)).toStrictEqual(undefined);
});

defineTest('ANY deserializer: wire date', (sandbox) => {
  expect(
    deserializeAny(sandbox, { '$jsii.date': '2019-11-18T13:01:20.515Z' }),
  ).toStrictEqual('2019-11-18T13:01:20.515Z');
});

defineTest('ANY deserializer: enum', (sandbox) => {
  expect(
    deserializeAny(sandbox, {
      '$jsii.enum': 'jsii-calc.AllTypesEnum/YOUR_ENUM_VALUE',
    }),
  ).toStrictEqual(100);
});

defineTest('ANY deserializer: wire map', (sandbox) => {
  const input = {
    '$jsii.map': {
      foo: 123,
      bar: { '$jsii.enum': 'jsii-calc.AllTypesEnum/YOUR_ENUM_VALUE' },
    },
  };
  expect(deserializeAny(sandbox, input)).toStrictEqual({
    foo: 123,
    bar: 100,
  });
});

defineTest('ANY deserializer: by value', (sandbox) => {
  const ref = sandbox.create({
    fqn: '@scope/jsii-calc-lib.Number',
    args: [444],
  });

  const input = {
    foo: 123,
    bar: { '$jsii.enum': 'jsii-calc.AllTypesEnum/YOUR_ENUM_VALUE' },
    struct: {
      '$jsii.struct': {
        fqn: 'jsii-calc.StructB',
        data: { requiredString: 'Bazinga!', optionalBoolean: false },
      },
    },
    ref,
  };

  expect(deserializeAny(sandbox, input)).toStrictEqual({
    foo: 123,
    bar: 100,
    struct: {
      requiredString: 'Bazinga!',
      optionalBoolean: false,
    },
    ref: { value: 444 },
  });
});

defineTest('ANY serializer: null/undefined', (sandbox) => {
  expect(serializeAny(sandbox, 'anyNull')).toStrictEqual(undefined);
  expect(serializeAny(sandbox, 'anyUndefined')).toStrictEqual(undefined);
});

defineTest('ANY serializer: function (fails)', (sandbox) => {
  expect(() => serializeAny(sandbox, 'anyFunction')).toThrow(
    /JSII Kernel is unable to serialize `function`. An instance with methods might have been returned by an `any` method\?/,
  );
});

defineTest('ANY serializer: date', (sandbox) => {
  expect(serializeAny(sandbox, 'anyDate')).toStrictEqual({
    '$jsii.date': '2019-11-18T13:01:20.515Z',
  });
});

defineTest('ANY serializer: primitives', (sandbox) => {
  expect(serializeAny(sandbox, 'anyNumber')).toStrictEqual(123);
  expect(serializeAny(sandbox, 'anyZero')).toStrictEqual(0);
  expect(serializeAny(sandbox, 'anyString')).toStrictEqual('foo');
  expect(serializeAny(sandbox, 'anyEmptyString')).toStrictEqual('');
  expect(serializeAny(sandbox, 'anyBooleanTrue')).toStrictEqual(true);
  expect(serializeAny(sandbox, 'anyBooleanFalse')).toStrictEqual(false);
});

defineTest('ANY serializer: array', (sandbox) => {
  expect(serializeAny(sandbox, 'anyArray')).toEqual([
    1,
    2,
    3,
    {
      '$jsii.byref': '@scope/jsii-calc-lib.Number@10000',
      '$jsii.interfaces': undefined,
    },
    { foo: 'bar' },
  ]);
});

defineTest('ANY serializer: hash', (sandbox) => {
  expect(serializeAny(sandbox, 'anyHash')).toStrictEqual({
    hello: 1234,
    world: {
      '$jsii.byref': '@scope/jsii-calc-lib.Number@10000',
      '$jsii.interfaces': undefined,
    },
  });
});

defineTest('ANY serializer: ref', (sandbox) => {
  expect(serializeAny(sandbox, 'anyRef')).toStrictEqual({
    '$jsii.byref': '@scope/jsii-calc-lib.Number@10000',
    '$jsii.interfaces': undefined,
  });
});

defineTest('Override transitive property', (sandbox) => {
  //////////
  // GIVEN
  //////////
  const originalString = 'r00t';
  const initialOverriddenPropValue = 'Overridden Value';
  let propValue = initialOverriddenPropValue;
  sandbox.callbackHandler = makeSyncCallbackHandler((callback) => {
    const getOrSet = callback.get ?? callback.set;
    // We don't expect to receive any other callback
    expect(getOrSet).toBeDefined();
    expect(getOrSet?.property).toBe('dynamicProperty');

    if (callback.get) {
      return propValue;
    }
    propValue = callback.set?.value;
    return void 0;
  });

  //////////
  // WHEN
  //////////
  const objref = sandbox.create({
    fqn: 'jsii-calc.DynamicPropertyBearerChild',
    args: [originalString],
    overrides: [{ property: 'dynamicProperty' }],
  });

  //////////
  // THEN
  //////////

  // Reading the "super" property
  expect(sandbox.get({ objref, property: 'dynamicProperty' }).value).toBe(
    originalString,
  );
  expect(sandbox.get({ objref, property: 'valueStore' }).value).toBe(
    originalString,
  );

  // Setting the dynamicProperty value through the override
  expect(
    sandbox.invoke({ objref, method: 'overrideValue', args: ['N3W'] }).result,
  ).toBe(initialOverriddenPropValue);
  // Checking the side effect happened on the override:
  expect(propValue).toBe('N3W');
  // Check the "super" property didn't change:
  expect(sandbox.get({ objref, property: 'dynamicProperty' }).value).toBe(
    originalString,
  );
  expect(sandbox.get({ objref, property: 'valueStore' }).value).toBe(
    originalString,
  );

  // Set the "super" property now
  sandbox.set({ objref, property: 'dynamicProperty', value: '' });
  // Check the side effect made it to the storage
  expect(sandbox.get({ objref, property: 'valueStore' }).value).toBe('');
  // Check the overridden property didn't change...
  expect(propValue).toBe('N3W');
});

// =================================================================================================

const testNames: { [name: string]: boolean } = {};

async function createCalculatorSandbox(name: string) {
  if (name in testNames) {
    throw new Error(`Duplicate test name: ${name}`);
  }
  testNames[name] = true;

  const initialCallbackHandler = () => {
    throw new Error('Callback invoked without a callback handler');
  };
  const sandbox = new Kernel(initialCallbackHandler);

  if (recordingOutput) {
    const inputOutputLogPath = join(recordingOutput, `${name}.log`);
    recordInteraction(sandbox, inputOutputLogPath);
  }

  sandbox.traceEnabled = `${process.env.JSII_DEBUG}` === '1';

  sandbox.load({
    tarball: await preparePackage('@scope/jsii-calc-base-of-base'),
    name: '@scope/jsii-calc-base-of-base',
    version: calcBaseVersion,
  });
  sandbox.load({
    tarball: await preparePackage('@scope/jsii-calc-base'),
    name: '@scope/jsii-calc-base',
    version: calcBaseVersion,
  });
  sandbox.load({
    tarball: await preparePackage('@scope/jsii-calc-lib'),
    name: '@scope/jsii-calc-lib',
    version: calcLibVersion,
  });
  sandbox.load({
    tarball: await preparePackage('jsii-calc'),
    name: 'jsii-calc',
    version: calcVersion,
  });
  return sandbox;
}

const cache: { [module: string]: string } = {};

async function preparePackage(module: string, useCache = true) {
  if (module in cache && useCache) {
    return cache[module];
  }

  const staging = await fs.mkdtemp(
    path.join(os.tmpdir(), 'jsii-kernel-tests-'),
  );

  // clean up only if we are not recording, so playback can refer to these
  if (!recordingOutput) {
    process.on('exit', () => fs.removeSync(staging)); // cleanup
  }

  const packageRoot = findPackageRoot(module);
  await new Promise((ok, ko) => {
    const child = childProcess.spawn('npm', ['pack', packageRoot], {
      cwd: staging,
      shell: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const stdout = new Array<Buffer>();
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.once('exit', (code, signal) => {
      if (code === 0) {
        return ok();
      }
      if (code != null) {
        return ko(`'npm pack' exited with code ${code}`);
      }
      return ko(`'npm pack' killed by signal ${signal}`);
    });
  });
  const dir = path.join(staging, (await fs.readdir(staging))[0]);
  return (cache[module] = dir);
}

function findPackageRoot(pkg: string) {
  return path.resolve(path.join(require.resolve(`${pkg}/package.json`), '..'));
}

/**
 * synchronous overrides are implemented as a simple callback function that gets
 * all the information needed to perform the callback and return the result.
 */
function makeSyncCallbackHandler(logic: (callback: Callback) => any) {
  return function (this: Kernel, callback: Callback) {
    // since sync callbacks must be handled at host level, we will "fake"
    // how @jsii/runtime and a client will interact when a callback is requested
    const recording: fs.WriteStream = (this as any).logfile;

    if (recording) {
      // @jsii/runtime => client (callback request from the runtime)
      recording.write(`< ${JSON.stringify({ callback })}\n`);
    }

    const result = logic(callback);

    if (recording) {
      // client => @jsii/runtime (callback completion by client)
      recording.write(
        `> ${JSON.stringify({ complete: { cbid: callback.cbid, result } })}\n`,
      );
    }

    return result;
  };
}

export function deepEqualWithRegex(lvalue: any, rvalue: any): boolean {
  if (lvalue === rvalue) {
    return true;
  }
  if (typeof lvalue === 'string' && rvalue instanceof RegExp) {
    return rvalue.test(lvalue);
  }
  if (typeof lvalue !== typeof rvalue) {
    return false;
  }
  if (Array.isArray(lvalue) !== Array.isArray(rvalue)) {
    return false;
  }
  if (Array.isArray(lvalue) /* && Array.isArray(rvalue) */) {
    if (lvalue.length !== rvalue.length) {
      return false;
    }
    for (let i = 0; i < lvalue.length; i++) {
      if (!deepEqualWithRegex(lvalue[i], rvalue[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeof lvalue === 'object' /* && typeof rvalue === 'object' */) {
    if (lvalue === null || rvalue === null) {
      // If both were null, they'd have been ===
      return false;
    }
    const keys = Object.entries(lvalue)
      .filter(([, v]) => v != null)
      .map(([k]) => k);
    if (keys.length !== Object.keys(rvalue).length) {
      return false;
    }
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(rvalue, key)) {
        return false;
      }
      if (!deepEqualWithRegex(lvalue[key], rvalue[key])) {
        return false;
      }
    }
    return true;
  }
  // Neither object, nor array: I deduce this is primitive type
  // Primitive type and not ===, so I deduce not deepEqual
  return false;
}

function create(kernel: Kernel, fqn: string) {
  return (...args: any[]) => {
    return kernel.create({ fqn, args });
  };
}

function set(kernel: Kernel, objref: ObjRef) {
  return (property: string, value: any) => {
    return kernel.set({ objref, property, value });
  };
}

function get(kernel: Kernel, objref: ObjRef) {
  return (property: string) => {
    return kernel.get({ objref, property }).value;
  };
}

/**
 * Passes `input` to the kernel through an "any" type and returns the JSON
 * stringified version that the JavaScript code saw.
 */
function deserializeAny(sandbox: Kernel, input: any) {
  const ret = sandbox.sinvoke({
    fqn: 'jsii-calc.JsonFormatter',
    method: 'stringify',
    args: [input],
  });
  if (ret.result === undefined) {
    return undefined;
  }
  const json = JSON.parse(ret.result);
  return json;
}

function serializeAny(sandbox: Kernel, method: string): any {
  return sandbox.sinvoke({ fqn: 'jsii-calc.JsonFormatter', method }).result;
}
