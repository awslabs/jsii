import {
    EnumFromScopedModule,
    IDoublable,
    IFriendly,
    MyFirstStruct,
    Number,
    StructWithOnlyOptionals,
    Value
} from '@scope/jsii-calc-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { IFriendlyRandomGenerator, IRandomNumberGenerator, Multiply } from './calculator';

const bundled = require('@fixtures/jsii-calc-bundled');
import * as base from '@scope/jsii-calc-base';

const readFile = promisify(fs.readFile);

export enum AllTypesEnum {
    MY_ENUM_VALUE,
    YOUR_ENUM_VALUE = 100,
    THIS_IS_GREAT
}

export enum StringEnum {
    A = 'A!',
    B = 'B?',
    C = 'C.'
}

export class EnumDispenser {
    public static randomStringLikeEnum(): StringEnum {
        // Haha! I lied, it's not random!! *EVIL LAUGHTER*
        return StringEnum.B;
    }

    public static randomIntegerLikeEnum(): AllTypesEnum {
        // Haha! I lied, it's not random!! *EVIL LAUGHTER*
        return AllTypesEnum.YOUR_ENUM_VALUE;
    }

    private constructor() { }
}

/**
 * This class includes property for all types supported by jsii. The setters will validate
 * that the value set is of the expected type and throw otherwise.
 */
export class AllTypes {

    // boolean

    private boolValue = false;

    get booleanProperty() {
        return this.boolValue;
    }

    set booleanProperty(value: boolean) {
        if (typeof(value) !== 'boolean') {
            throw new Error('not a boolean');
        }
        this.boolValue = value;
    }

    // string

    private stringValue = 'first value';

    get stringProperty() {
        return this.stringValue;
    }

    set stringProperty(value: string) {
        if (typeof(value) !== 'string') {
            throw new Error('not a string');
        }

        this.stringValue = value;
    }

    // number

    private numberValue = 0;

    get numberProperty() {
        return this.numberValue;
    }

    set numberProperty(value: number) {
        if (typeof(value) !== 'number') {
            throw new Error('not a number');
        }
        this.numberValue = value;
    }

    // date

    private dateValue = new Date();

    get dateProperty(): Date {
        return this.dateValue;
    }

    set dateProperty(value: Date) {
        // https://stackoverflow.com/a/643827/737957
        if (Object.prototype.toString.call(value) !== '[object Date]') {
            throw new Error('not a date: ' + value + ' type=' + typeof(value));
        }

        this.dateValue = value;
    }

    // json

    private jsonValue: object = {};

    get jsonProperty(): object {
        return this.jsonValue;
    }

    set jsonProperty(value: object) {
        if (typeof(value) !== 'object') {
            throw new Error('not an object');
        }

        this.jsonValue = value;
    }

    // map

    private mapValue: { [key: string]: Number } = {};

    get mapProperty(): { [key: string]: Number } {
        return this.mapValue;
    }

    set mapProperty(value: { [key: string]: Number }) {
        if (typeof(value) !== 'object') {
            throw new Error('not a map');
        }
        this.mapValue = value;
    }

    // array

    private arrayValue: string[] = [];

    get arrayProperty(): string[] {
        return this.arrayValue;
    }

    set arrayProperty(value: string[]) {
        if (!Array.isArray(value)) {
            throw new Error('not an array');
        }

        this.arrayValue = value;
    }

    // non-typed (any)

    anyProperty: any;
    anyArrayProperty: any[] = [];
    anyMapProperty: { [key: string]: any } = {};

    // non-typed (unknown)

    unknownProperty: unknown;
    unknownArrayProperty: unknown[] = [];
    unknownMapProperty: { [key: string]: unknown } = {};

    // unions

    unionProperty: string | number | Number | Multiply = 'foo';
    unionArrayProperty: (Value | number)[] = [];
    unionMapProperty: { [key: string]: (Number | number | string) } = {};

    // enum

    public optionalEnumValue?: StringEnum;
    private enumValue: AllTypesEnum = AllTypesEnum.THIS_IS_GREAT;

    get enumProperty() {
        return this.enumValue;
    }

    set enumProperty(value: AllTypesEnum) {
        this.enumValue = value;
        switch (value) {
            case AllTypesEnum.MY_ENUM_VALUE:
            case AllTypesEnum.YOUR_ENUM_VALUE:
            case AllTypesEnum.THIS_IS_GREAT:
                return;
            default:
                throw new Error('Invalid enum: ' + value);
        }
    }

    get enumPropertyValue(): number {
        return this.enumValue.valueOf();
    }

    enumMethod(value: StringEnum) {
        return value;
    }


    public anyOut(): any {
        const ret = new Number(42);
        Object.defineProperty(ret, 'tag', {
            value: "you're it"
        });
        return ret;
    }

    public anyIn(inp: any) {
        if (inp.tag !== "you're it") {
            throw new Error(`Not the same object that I gave you, got: ${JSON.stringify(inp)}`);
        }
    }
}

//
// Return an object literal from JavaScript which conforms to a class (effectively treating
// the class as an interface). We want the native code to be able to wrap the resulting object
// in a native class.
//

export class JSObjectLiteralToNative {
    returnLiteral(): JSObjectLiteralToNativeClass {
        return {
            propA: 'Hello',
            propB: 102
        };
    }
}

export class JSObjectLiteralToNativeClass {
    propA: string = 'A';
    propB: number = 0;
}

/**
 * Verify that object references can be passed inside collections.
 */
export class ObjectRefsInCollections {
    /**
     * Returns the sum of all values
     */
    sumFromArray(values: Value[]) {
        let sum = 0;
        for (let val of values) {
            sum += val.value;
        }
        return sum;
    }

    /**
     * Returns the sum of all values in a map
     */
    sumFromMap(values: { [key: string]: Value }) {
        let sum = 0;
        for (let key of Object.keys(values)) {
            sum += values[key].value;
        }
        return sum;
    }
}

export class RuntimeTypeChecking {
    /**
     * Used to verify verification of number of method arguments.
     */
    public methodWithOptionalArguments(arg1: number, arg2: string, arg3?: Date) {
        arg1;
        arg2;
        arg3;
    }

    public methodWithDefaultedArguments(arg1: number = 2, arg2?: string, arg3: Date = new Date()) {
        arg1;
        arg2;
        arg3;
    }

    public methodWithOptionalAnyArgument(arg?: any) {
        arg;
    }
}

export class OptionalConstructorArgument {
    public constructor(public readonly arg1: number,
                       public readonly arg2: string,
                       public readonly arg3?: Date) {
    }
}

export class DefaultedConstructorArgument {
    public constructor(public readonly arg1: number = 2,
                       public readonly arg2?: string,
                       public readonly arg3: Date = new Date()) {
    }
}

export namespace DerivedClassHasNoProperties {

    export class Base {
        prop: string = '';
    }

    export class Derived extends Base {

    }

}

export class AsyncVirtualMethods {
    async callMe() {
        return await this.overrideMe(10) + this.dontOverrideMe() + await this.overrideMeToo();
    }

    async overrideMe(mult: number) {
        return 12 * mult;
    }

    async overrideMeToo() {
        return 0;
    }

    /**
     * Just calls "overrideMeToo"
     */
    callMe2() {
        return this.overrideMeToo();
    }

    /**
     * This method calls the "callMe" async method indirectly, which will then
     * invoke a virtual method. This is a "double promise" situation, which
     * means that callbacks are not going to be available immediate, but only
     * after an "immediates" cycle.
     */
    async callMeDoublePromise() {
        return new Promise<number>(ok => {
            setImmediate(() => {
                this.callMe().then(ok);
            });
        });
    }

    dontOverrideMe() {
        return 8;
    }
}

export class SyncVirtualMethods {
    callerIsMethod() {
        return this.virtualMethod(10);
    }

    get callerIsProperty() {
        return this.virtualMethod(10);
    }

    set callerIsProperty(x: number) {
        this.virtualMethod(x);
    }

    async callerIsAsync() {
        return this.virtualMethod(10);
    }

    virtualMethod(n: number): number {
        return n * 2;
    }

    // read-write property

    theProperty: string = 'initial value';

    modifyValueOfTheProperty(value: string) {
        this.theProperty = value;
    }

    retrieveValueOfTheProperty() {
        return this.theProperty;
    }

    // read-only property

    readonly readonlyProperty: string = 'readonly-property-initial-value';

    retrieveReadOnlyProperty() {
        return this.readonlyProperty;
    }

    // property backed by functions

    get otherProperty() {
        return 'other property';
    }

    set otherProperty(value: string) {
        this.valueOfOtherProperty = value;
    }

    valueOfOtherProperty: string = '';

    public modifyOtherProperty(value: string) {
        this.otherProperty = value;
    }

    public retrieveOtherProperty() {
        return this.otherProperty;
    }

    // property with a short name (makes sure for example that java's
    // convertion of getA to "a" is not assuming that the length is > 1).

    a: number = 0;

    readA() {
        return this.a;
    }

    writeA(value: number) {
        this.a = value;
    }

}

export class VirtualMethodPlayground {
    async serialSumAsync(count: number) {
        let sum = 0;
        for (let i = 0; i < count; ++i) {
            const result = await this.overrideMeAsync(i);
            sum += result;
        }
        return sum;
    }

    async parallelSumAsync(count: number) {
        let all = new Array<Promise<number>>();
        for (let i = 0; i < count; ++i) {
            all.push(this.overrideMeAsync(i));
        }

        const result = await Promise.all(all);
        return result.reduce((x, i) => x + i, 0);
    }

    sumSync(count: number) {
        let sum = 0;
        for (let i = 0; i < count; ++i) {
            sum += this.overrideMeSync(i);
        }
        return sum;
    }

    async overrideMeAsync(index: number) {
        return 10 * index;
    }

    overrideMeSync(index: number) {
        return 10 * index;
    }
}

export class DoubleTrouble implements IFriendlyRandomGenerator {
    next() {
        return 12;
    }

    hello() {
        return 'world';
    }
}

export class Polymorphism {
    sayHello(friendly: IFriendly) {
        return `oh, ${friendly.hello()}`;
    }
}

/**
 * This allows us to test that a reference can be stored for objects that
 * implement interfaces.
 */
export class NumberGenerator {
    constructor(public generator: IRandomNumberGenerator) {

    }

    nextTimes100() {
        return this.generator.next() * 100;
    }

    isSameGenerator(gen: IRandomNumberGenerator) {
        return this.generator === gen;
    }
}

export class JSObjectLiteralForInterface {

    giveMeFriendly(): IFriendly {
        return {
            hello: () => 'I am literally friendly!'
        };
    }

    giveMeFriendlyGenerator(): IFriendlyRandomGenerator {
        return {
            hello: () => 'giveMeFriendlyGenerator',
            next: () => 42
        };
    }

}

export class GreetingAugmenter {
    betterGreeting(friendly: IFriendly): string {
        return friendly.hello() + ' Let me buy you a drink!';
    }
}

/**
 * A struct which derives from another struct.
 */
export interface DerivedStruct extends MyFirstStruct {
    /**
     * An example of a non primitive property.
     */
    readonly nonPrimitive: DoubleTrouble
    readonly bool: boolean
    readonly anotherRequired: Date
    readonly optionalArray?: string[]
    readonly optionalAny?: any
    /**
     * This is optional.
     */
    readonly anotherOptional?: { [key: string]: Value }
}

export class GiveMeStructs {
    /**
     * Returns the "anumber" from a MyFirstStruct struct;
     */
    readFirstNumber(first: MyFirstStruct) {
        return first.anumber;
    }

    /**
     * Returns the boolean from a DerivedStruct struct.
     */
    readDerivedNonPrimitive(derived: DerivedStruct) {
        return derived.nonPrimitive;
    }

    /**
     * Accepts a struct of type DerivedStruct and returns a struct of type FirstStruct.
     */
    derivedToFirst(derived: DerivedStruct) {
        return derived as MyFirstStruct;
    }

    get structLiteral(): StructWithOnlyOptionals {
        return {
            optional1: 'optional1FromStructLiteral',
            optional3: false
        };
    }
}

export interface IInterfaceWithProperties {
    readonly readOnlyString: string;
    readWriteString: string;
}

export interface IInterfaceWithPropertiesExtension extends IInterfaceWithProperties {
    foo: number;
}

export class UsesInterfaceWithProperties {
    constructor(public readonly obj: IInterfaceWithProperties) {

    }

    public justRead() {
        return this.obj.readOnlyString;
    }

    public writeAndRead(value: string) {
        this.obj.readWriteString = value;
        return this.obj.readWriteString;
    }

    public readStringAndNumber(ext: IInterfaceWithPropertiesExtension) {
        return `base=${ext.readOnlyString} child=${ext.foo} keys=[${Object.keys(ext).join(',')}]`;
    }
}

export class AllowedMethodNames {

    /**
     * getXxx() is not allowed (see negatives), but getXxx(a, ...) is okay.
     */
    public getFoo(withParam: string) {
        return withParam;
    }

    public getBar(_p1: string, _p2: number) {
        return;
    }

    /**
     * setFoo(x) is not allowed (see negatives), but setXxx(a, b, ...) is okay.
     */
    public setFoo(_x: string, _y: number) {
        return;
    }

    public setBar(_x: string, _y: number, _z: boolean) {
        return;
    }
}

export interface IReturnsNumber {
    obtainNumber(): IDoublable;

    readonly numberProp: Number;
}

export class OverrideReturnsObject {
    public test(obj: IReturnsNumber) {
        return obj.obtainNumber().doubleValue + obj.numberProp.doubleValue;
    }
}

export class Thrower {
    public throwError() {
        this.doThrowError();
    }

    private doThrowError() {
        throw new Error();
    }
}

export class VariadicMethod {
    private readonly prefix: number[];

    /**
     * @param prefix a prefix that will be use for all values returned by `#asArray`.
     */
    constructor(...prefix: number[]) {
        this.prefix = prefix;
    }

    /**
     * @param first  the first element of the array to be returned (after the `prefix` provided at construction time).
     * @param others other elements to be included in the array.
     */
    public asArray(first: number, ...others: number[]): number[] {
        return [...this.prefix, first, ...others];
    }
}

export class VariadicInvoker {
    public constructor(private readonly method: VariadicMethod) { }

    public asArray(...values: number[]): number[] {
        const [first, ...rest] = values;
        return this.method.asArray(first, ...rest);
    }
}

export class Statics {
    constructor(public readonly value: string) {
    }

    /**
     * Jsdocs for static method
     * @param name The name of the person to say hello to
     */
    public static staticMethod(name: string) {
        return `hello ,${name}!`;
    }

    public justMethod() {
        return this.value;
    }

    /**
     * Jsdocs for static property.
     */
    public static readonly Foo = 'hello';

    /**
     * Constants may also use all-caps.
     */
    public static readonly BAR = 1234;

    /**
     * Constants can also use camelCase.
     */
    public static readonly zooBar: { [name: string]: string } = { hello: 'world' };

    private static _instance?: Statics;

    /**
     * Jsdocs for static getter.
     */
    public static get instance(): Statics {
        if (!this._instance) {
            this._instance = new Statics('default');
        }
        return this._instance;
    }

    /**
     *Jsdocs for static setter.
     */
    public static set instance(val: Statics) {
        this._instance = val;
    }

    public static nonConstStatic = 100; // this should not be represented as a constant in target languages
    public static readonly ConstObj = new DoubleTrouble(); // should be initialized statically
}

// https://en.wikipedia.org/wiki/List_of_Java_keywords
export class JavaReservedWords {
    public abstract() {
    }

    public assert() {
    }

    public boolean() {
    }

    public break() {
    }

    public byte() {
    }

    public case() {
    }

    public catch() {
    }

    public char() {
    }

    public class() {
    }

    public const() {
    }

    public continue() {
    }

    public default() {
    }

    public double() {
    }

    public do() {
    }

    public else() {
    }

    public enum() {
    }

    public extends() {
    }

    public false() {
    }

    public final() {
    }

    public finally() {
    }

    public float() {
    }

    public for() {
    }

    public goto() {
    }

    public if() {
    }

    public implements() {
    }

    public import() {
    }

    public instanceof() {
    }

    public int() {
    }

    public interface() {
    }

    public long() {
    }

    public native() {
    }

    public new() {
    }

    public null() {
    }

    public package() {
    }

    public private() {
    }

    public protected() {
    }

    public public() {
    }

    public return() {
    }

    public short() {
    }

    public static() {
    }

    public strictfp() {
    }

    public super() {
    }

    public switch() {
    }

    public synchronized() {
    }

    public this() {
    }

    public throw() {
    }

    public throws() {
    }

    public transient() {
    }

    public true() {
    }

    public try() {
    }

    public void() {
    }

    public volatile() {
    }

    public while = 'hello';
}

export class PythonReservedWords {

    public and() {}

    public as() {}

    public assert() {}

    public async() {}

    public await() {}

    public break() {}

    public class() {}

    public continue() {}

    public def() {}

    public del() {}

    public elif() {}

    public else() {}

    public except() {}

    public finally() {}

    public for() {}

    public from() {}

    public global() {}

    public if() {}

    public import() {}

    public in() {}

    public is() {}

    public lambda() {}

    public nonlocal() {}

    public not() {}

    public or() {}

    public pass() {}

    public raise() {}

    public return() {}

    public try() {}

    public while() {}

    public with() {}

    public yield() {}
}

// "self" is technically not a keyword in Python. It's the conventional name of
// the "this instance" reference. We can slugify this to our heart's content,
// without much impact on the developer experience - but it needs to happen!
export namespace PythonSelf {
    export class ClassWithSelf {
        public constructor(public readonly self: string) { }

        public method(self: number): string {
            return self.toString();
        }
    }

    export class ClassWithSelfKwarg {
        public constructor(public readonly props: StructWithSelf) { }
    }

    export interface StructWithSelf {
        readonly self: string;
    }

    export interface IInterfaceWithSelf {
        method(self: number): string;
    }
}

export interface UnionProperties {
    readonly foo?: string | number;
    readonly bar: AllTypes | string | number;
}

export class UseBundledDependency {
    value() {
        return bundled;
    }
}

/**
 * Test fixture to verify that jsii modules can use the node standard library.
 */
export class NodeStandardLibrary {
    /**
     * Reads a local resource file (resource.txt) asynchronously.
     * @returns "Hello, resource!"
     */
    public async fsReadFile() {
        const value = await readFile(path.join(__dirname, 'resource.txt'));
        return value.toString();
    }

    /**
     * Sync version of fsReadFile.
     * @returns "Hello, resource! SYNC!"
     */
    public fsReadFileSync() {
        return fs.readFileSync(path.join(__dirname, 'resource.txt')).toString() + ' SYNC!';
    }

    /**
     * Returns the current os.platform() from the "os" node module.
     */
    public get osPlatform(): string {
        return os.platform();
    }

    /**
     * Uses node.js "crypto" module to calculate sha256 of a string.
     * @returns "6a2da20943931e9834fc12cfe5bb47bbd9ae43489a30726962b576f4e3993e50"
     */
    public cryptoSha256() {
        const hash = crypto.createHash('sha256');

        hash.update('some data to hash');
        return hash.digest('hex');
    }
}

/**
 * Depend on a type from jsii-calc-base as a test for awslabs/jsii#128
 */
export class UseCalcBase {
    public hello(): base.Base {
        return {
            typeName: () => 'hello'
        };
    }
}

export interface ImplictBaseOfBase extends base.BaseProps {
    readonly goo: Date;
}

/**
 * See awslabs/jsii#138
 */
export class ReferenceEnumFromScopedPackage {
    public foo?: EnumFromScopedModule = EnumFromScopedModule.VALUE2;

    public loadFoo(): EnumFromScopedModule | undefined {
        return this.foo;
    }

    public saveFoo(value: EnumFromScopedModule) {
        this.foo = value;
    }
}

/**
 * awslabs/jsii#208
 * Interface within a namespace
 */
export namespace InterfaceInNamespaceOnlyInterface {

    // it's a special case when only an interface is exported from a namespace
    export interface Hello {
        readonly foo: number
    }

}

export namespace InterfaceInNamespaceIncludesClasses {

    export class Foo {
        public bar?: string;
    }

    export interface Hello {
        readonly foo: number
    }
}

/**
 * awslabs/jsii#175
 * Interface proxies (and builders) do not respect optional arguments in methods
 */
export interface IInterfaceWithOptionalMethodArguments {
    hello(arg1: string, arg2?: number): void
}
export class OptionalArgumentInvoker {
    constructor(private readonly delegate: IInterfaceWithOptionalMethodArguments) { }

    public invokeWithoutOptional() {
        return this.delegate.hello('Howdy');
    }

    public invokeWithOptional() {
        return this.delegate.hello('Howdy', 1337);
    }
}

/**
 * awslabs/jsii#220
 * Abstract return type
 */

export interface IInterfaceImplementedByAbstractClass {
    readonly propFromInterface: string;
}

export abstract class AbstractClassBase {
    public abstract readonly abstractProperty: string;
}

export abstract class AbstractClass extends AbstractClassBase implements IInterfaceImplementedByAbstractClass {
    public nonAbstractMethod() {
        return 42;
    }

    public abstract abstractMethod(name: string): string;

    public get propFromInterface() {
        return 'propFromInterfaceValue';
    }
}

class ConcreteClass extends AbstractClass {
    public abstractMethod(name: string) {
        return `Hello, ${name}!!`;
    }

    public get abstractProperty() {
        return 'Hello, dude!';
    }
}

export class AbstractClassReturner {
    public giveMeAbstract(): AbstractClass {
        return new ConcreteClass();
    }

    public giveMeInterface(): IInterfaceImplementedByAbstractClass {
        return new ConcreteClass();
    }

    public get returnAbstractFromProperty(): AbstractClassBase {
        return {
            abstractProperty: 'hello-abstract-property'
        };
    }
}

export interface IMutableObjectLiteral {
    value: string;
}

export class ClassWithMutableObjectLiteralProperty {
    public mutableObject: IMutableObjectLiteral = { value: 'default' };
}

export class DoNotOverridePrivates {
    private privateMethod(): string {
        return 'privateMethod';
    }

    private privateProperty = 'privateProperty';

    public privateMethodValue() {
        return this.privateMethod();
    }

    public privatePropertyValue() {
        return this.privateProperty;
    }

    public changePrivatePropertyValue(newValue: string) {
        this.privateProperty = newValue;
    }
}

/**
 * Class that implements interface properties automatically, but using a private constructor
 */
export class ClassWithPrivateConstructorAndAutomaticProperties implements IInterfaceWithProperties {
    public static create(readOnlyString: string, readWriteString: string) {
        return new ClassWithPrivateConstructorAndAutomaticProperties(readOnlyString, readWriteString);
    }

    private constructor(public readonly readOnlyString: string, public readWriteString: string) {
    }
}

export interface IInterfaceWithMethods {
    readonly value: string;

    doThings(): void;
}

/**
 * Even though this interface has only properties, it is disqualified from being a datatype
 * because it inherits from an interface that is not a datatype.
 */
export interface IInterfaceThatShouldNotBeADataType extends IInterfaceWithMethods {
    readonly otherValue: string;
}

/**
 * jsii#284: do not recognize "any" as an optional argument
 */
export class DoNotRecognizeAnyAsOptional {
    public method(_requiredAny: any, _optionalAny?: any, _optionalString?: string) {

    }
}

/**
 * jsii#282, aws-cdk#157: null should be treated as "undefined"
 */
export class NullShouldBeTreatedAsUndefined {
    public changeMeToUndefined? = 'hello';

    constructor(_param1: string, optional?: any) {
        if (optional !== undefined) {
            throw new Error('Expecting second constructor argument to be "undefined"');
        }
    }

    public giveMeUndefined(value?: any) {
        if (value !== undefined) {
            throw new Error('I am disappointed. I expected undefined and got: ' + JSON.stringify(value));
        }
    }

    public giveMeUndefinedInsideAnObject(input: NullShouldBeTreatedAsUndefinedData) {
        if (input.thisShouldBeUndefined !== undefined) {
            throw new Error('I am disappointed. I expected undefined in "thisShouldBeUndefined" and got: ' + JSON.stringify(input));
        }

        const array = input.arrayWithThreeElementsAndUndefinedAsSecondArgument;
        if (array.length !== 3) {
            throw new Error('Expecting "arrayWithThreeElementsAndUndefinedAsSecondArgument" to have three elements: ' + JSON.stringify(input));
        }

        if (array[1] !== undefined) {
            throw new Error('Expected arrayWithThreeElementsAndUndefinedAsSecondArgument[1] to be undefined: ' + JSON.stringify(input));
        }
    }

    public verifyPropertyIsUndefined() {
        if (this.changeMeToUndefined !== undefined) {
            throw new Error('Expecting property "changeMeToUndefined" to be undefined, and it is: ' + this.changeMeToUndefined);
        }
    }
}

export interface NullShouldBeTreatedAsUndefinedData {
    readonly thisShouldBeUndefined?: any;
    readonly arrayWithThreeElementsAndUndefinedAsSecondArgument: any[];
}

export class DontComplainAboutVariadicAfterOptional {
    public optionalAndVariadic(optional?: string, ...things: string[]) {
        return `${optional} and ${things.join(',')}`;
    }
}

/**
 * jsii#298: show default values in sphinx documentation, and respect newlines.
 **/
export interface LoadBalancedFargateServiceProps {
    /**
     * The number of cpu units used by the task.
     * Valid values, which determines your range of valid values for the memory parameter:
     * 256 (.25 vCPU) - Available memory values: 0.5GB, 1GB, 2GB
     * 512 (.5 vCPU) - Available memory values: 1GB, 2GB, 3GB, 4GB
     * 1024 (1 vCPU) - Available memory values: 2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB
     * 2048 (2 vCPU) - Available memory values: Between 4GB and 16GB in 1GB increments
     * 4096 (4 vCPU) - Available memory values: Between 8GB and 30GB in 1GB increments
     *
     * This default is set in the underlying FargateTaskDefinition construct.
     *
     * @default 256
     */
    readonly cpu?: string;

    /**
     * The amount (in MiB) of memory used by the task.
     *
     * This field is required and you must use one of the following values, which determines your range of valid values
     * for the cpu parameter:
     *
     * 0.5GB, 1GB, 2GB - Available cpu values: 256 (.25 vCPU)
     *
     * 1GB, 2GB, 3GB, 4GB - Available cpu values: 512 (.5 vCPU)
     *
     * 2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB - Available cpu values: 1024 (1 vCPU)
     *
     * Between 4GB and 16GB in 1GB increments - Available cpu values: 2048 (2 vCPU)
     *
     * Between 8GB and 30GB in 1GB increments - Available cpu values: 4096 (4 vCPU)
     *
     * This default is set in the underlying FargateTaskDefinition construct.
     *
     * @default 512
     */
    readonly memoryMiB?: string;

    /**
     * The container port of the application load balancer attached to your Fargate service. Corresponds to container port mapping.
     *
     * @default 80
     */
    readonly containerPort?: number;

    /**
     * Determines whether the Application Load Balancer will be internet-facing
     *
     * @default true
     */
    readonly publicLoadBalancer?: boolean;

    /**
     * Determines whether your Fargate Service will be assigned a public IP address.
     *
     * @default false
     */
    readonly publicTasks?: boolean;
}

/**
 * Helps ensure the JSII kernel & runtime cooperate correctly when an un-exported instance of a class is returned with
 * a declared type that is an exported interface, and the instance inherits from an exported class.
 *
 * @returns an instance of an un-exported class that extends `ExportedBaseClass`, declared as `IPrivatelyImplemented`.
 *
 * @see https://github.com/aws/jsii/issues/320
 */
export class ReturnsPrivateImplementationOfInterface {
    public get privateImplementation(): IPrivatelyImplemented {
        return new PrivateImplementation();
    }
}
export interface IPrivatelyImplemented {
    readonly success: boolean;
}
export class ExportedBaseClass {
    constructor(public readonly success: boolean) {}
}
class PrivateImplementation extends ExportedBaseClass implements IPrivatelyImplemented {
    constructor() {
        super(true);
    }
}

/**
 * Host runtime version should be set via JSII_AGENT
 */
export class JsiiAgent {
    /**
     * Returns the value of the JSII_AGENT environment variable.
     */
    public static get jsiiAgent(): string | undefined {
        return process.env.JSII_AGENT;
    }
};

// To support module augmentation classes must support multiple declaration sites
// (the tail of which must be interfaces)
export class AugmentableClass {
    public methodOne(): void {
        console.log('methodOne');
    }
}

export interface AugmentableClass {
    methodTwo(): void;
}

// Ensure the JSII kernel tags instances with the "most appropriate" FQN type label, so that runtimes are able to
// correctly choose the implementation proxy that should be used. Failure to do so could cause situations where userland
// needs to up-cast an instance to an incompatible type, which certain runtimes (such as Java) will prevent.
// @See https://github.com/aws/jsii/issues/345
export class PublicClass {
    public hello(): void {}
}
export interface IPublicInterface {
    bye(): string;
}

export interface IPublicInterface2 {
    ciao(): string;
}
export class InbetweenClass extends PublicClass implements IPublicInterface2 {
    public ciao(): string { return 'ciao'; }
}
class PrivateClass extends InbetweenClass implements IPublicInterface {
    public bye(): string { return 'bye'; }
}

class HiddenClass implements IPublicInterface, IPublicInterface2 {
    public bye(): string { return 'bye'; }
    public ciao(): string { return 'ciao'; }
}

class HiddenSubclass extends HiddenClass {
}

export class Constructors {
    public static makeClass(): PublicClass {
        return new PrivateClass();  // Wire type should be InbetweenClass
    }

    public static makeInterface(): IPublicInterface {
        return new PrivateClass();  // Wire type should be IPublicInterface
    }

    public static makeInterface2(): IPublicInterface2 {
        return new PrivateClass();  // Wire type should be InbetweenClass
    }

    public static makeInterfaces(): IPublicInterface[] {
        return [new PrivateClass()];  // Wire type should be IPublicInterface[]
    }

    public static hiddenInterface(): IPublicInterface {
        return new HiddenClass();  // Wire type should be IPublicInterface
    }

    public static hiddenInterfaces(): IPublicInterface[] {
        return [new HiddenClass()];  // Wire type should be IPublicInterface[]
    }

    public static hiddenSubInterfaces(): IPublicInterface[] {
        return [new HiddenSubclass()];  // Wire type should be IPublicInterface[]
    }
}

/**
 * Test that a single instance can be returned under two different FQNs
 *
 * JSII clients can instantiate 2 different strongly-typed wrappers for the same
 * object. Unfortunately, this will break object equality, but if we didn't do
 * this it would break runtime type checks in the JVM or CLR.
 */
export class SingleInstanceTwoTypes {
    private instance = new PrivateClass();

    public interface1(): InbetweenClass {
        return this.instance;
    }

    public interface2(): IPublicInterface {
        return this.instance;
    }
}

// fixture to verify that null/undefined values in object hashes are treated
// as "unset". see awslabs/aws-cdk#965.
export interface EraseUndefinedHashValuesOptions {
    readonly option1?: string;
    readonly option2?: string;
}

export class EraseUndefinedHashValues {
    /**
     * Returns `true` if `key` is defined in `opts`. Used to check that undefined/null hash values
     * are being erased when sending values from native code to JS.
     */
    public static doesKeyExist(opts: EraseUndefinedHashValuesOptions, key: string): boolean {
        return key in opts;
    }

    /**
     * We expect "prop2" to be erased
     */
    public static prop2IsUndefined(): { [key: string]: any } {
        return {
            prop1: 'value1',
            prop2: undefined
        };
    }

    /**
     * We expect "prop1" to be erased
     */
    public static prop1IsNull(): { [key: string]: any } {
        return {
            prop1: null,
            prop2: 'value2'
        };
    }
}

// internal can be used to represent members that can only be accessed from the current module
export class StripInternal {
    public youSeeMe = 'hello';

    /**
     * This is an internal thing
     * @internal
     */
    public _youDontSeeMeAlthoughIamPublic = 'world'
}

/**
 * @internal
 */
export class InternalClass {
    public iAmNotHere = 'yes';
}

/**
 * @internal
 */
export interface InternalInterface {
    readonly prop: string;
}

/**
 * @internal
 */
export enum InternalEnum {
    Member1 = 12,
    Member2 = 23
}

export interface IInterfaceWithInternal {
    visible(): void;

    /** @internal */
    _hidden(): void;
}

export class ImplementsInterfaceWithInternal implements IInterfaceWithInternal {
    visible() { }

    /** @internal */
    _hidden() { }

    /** @internal */
    _alsoHidden() { }

    /** @internal */
    _propertiesToo?: string;
}

export class ImplementsInterfaceWithInternalSubclass extends ImplementsInterfaceWithInternal {
    /** @internal */
    _alsoHidden() { }

    /**
     * @internal
     */
    public _propertiesToo?: string;
}

//
// hidden interface erasure
// if a class/interface uses a hidden (private/internal) interface as base, the base will
// be erased from the API
//

interface IPrivateInterface {
    private: string;
}

export interface ExtendsInternalInterface extends InternalInterface {
    readonly boom: boolean
}

export class ImplementInternalInterface implements InternalInterface {
    prop = 'implement me'
}

export class ImplementsPrivateInterface implements IPrivateInterface {
    public private = 'i came from private into the light'
}

export interface IExtendsPrivateInterface extends IPrivateInterface {
    readonly moreThings: string[];
}

//
// hidden (private/internal) base interface erasure will copy non-hidden bases from
// hidden to consuming type.
//

export interface IAnotherPublicInterface {
    a: string;

}

/** @internal */
export interface IAnotherInternalInterface extends IAnotherPublicInterface {
    b: string;
}

export interface INonInternalInterface extends IAnotherInternalInterface {
    c: string;
}

/** @internal */
export interface IInternalInterfaceThatExtendsTheNonInternalOne extends INonInternalInterface {
    d: string;
}

interface IPrivateInterfaceThatExtendsTheNonInternalOne extends INonInternalInterface {
    e: string;
}

export class ClassThatImplementsTheInternalInterface implements IInternalInterfaceThatExtendsTheNonInternalOne, INonInternalInterface {
    public a = 'a';
    public b = 'b';
    public c = 'c';
    public d = 'd';
}

export class ClassThatImplementsThePrivateInterface implements IPrivateInterfaceThatExtendsTheNonInternalOne {
    public a = 'a';
    public b = 'b';
    public c = 'c';
    public e = 'e';
}

export class ConsumersOfThisCrazyTypeSystem {
    public consumeAnotherPublicInterface(obj: IAnotherPublicInterface) {
        return obj.a;
    }

    public consumeNonInternalInterface(obj: INonInternalInterface): any {
        return { a: obj.a, b: obj.b, c: obj.c };
    }
}


//
// Ensure the JSII kernel can pass "this" out to JSII remotes from within the constructor (this is dirty, but possible)
//
export abstract class PartiallyInitializedThisConsumer {
    public abstract consumePartiallyInitializedThis(obj: ConstructorPassesThisOut, dt: Date, ev: AllTypesEnum): string;
}

export class ConstructorPassesThisOut {
    constructor(consumer: PartiallyInitializedThisConsumer) {
        const result = consumer.consumePartiallyInitializedThis(this, new Date(0), AllTypesEnum.THIS_IS_GREAT);
        if (result !== 'OK') {
            throw new Error(`Expected OK but received ${result}`);
        }
    }
}

//
// Consumes a possibly empty struct and verifies it is turned to undefined when passed
// See: https://github.com/aws/jsii/issues/411
//
export class OptionalStructConsumer {
    public readonly parameterWasUndefined: boolean;
    public readonly fieldValue?: string;

    constructor(optionalStruct?: OptionalStruct) {
        this.parameterWasUndefined = optionalStruct === undefined;
        this.fieldValue = optionalStruct && optionalStruct.field;
    }
}
export interface OptionalStruct {
    readonly field?: string;
}


/**
 * This class has docs.
 *
 * The docs are great. They're a bunch of tags.
 *
 * @example
 *
 * function anExample() {
 * }
 *
 * @see https://aws.amazon.com/
 * @customAttribute hasAValue
 * @stable
 */
export class ClassWithDocs {
}

/**
 * This is used to validate the ability to use `this` from within a static context.
 *
 * https://github.com/awslabs/aws-cdk/issues/2304
 */
export class StaticContext {
    private static _staticVariable = true;

    public static canAccessStaticContext(): boolean {
        return this.staticContextAvailable();
    }

    private static staticContextAvailable() {
        return true;
    }

    public static get staticVariable() {
        return this._staticVariable;
    }

    public static set staticVariable(value: boolean) {
        this._staticVariable = value;
    }

    private constructor() { }
}

/**
 * This test is used to validate the runtimes can return correctly from a void callback.
 *
 * - Implement `overrideMe` (method does not have to do anything).
 * - Invoke `callMe`
 * - Verify that `methodWasCalled` is `true`.
 */
export abstract class VoidCallback {
    private _methodWasCalled = false;
    public get methodWasCalled(): boolean {
        return this._methodWasCalled;
    }
    public callMe(): void {
        this.overrideMe();
        this._methodWasCalled = true;
    }
    protected abstract overrideMe(): void;
}

/**
 * Verifies that private property declarations in constructor arguments are hidden.
 */
export class WithPrivatePropertyInConstructor {
    constructor(private readonly privateField: string = 'Success!') { }

    public get success() {
        return this.privateField === 'Success!';
    }
}

/**
 * Verifies that singleton enums are handled correctly
 *
 * https://github.com/aws/jsii/issues/231
 */
export class SingletonString {
    private constructor() { }

    public isSingletonString(value: string): boolean {
        return value === SingletonStringEnum.SINGLETON_STRING;
    }
}
/** A singleton string */
export enum SingletonStringEnum {
    /** 1337 */
    SINGLETON_STRING = '3L1T3!'
}
/**
 * Verifies that singleton enums are handled correctly
 *
 * https://github.com/aws/jsii/issues/231
 */
export class SingletonInt {
    private constructor() { }
    public isSingletonInt(value: number): boolean {
        return value === SingletonIntEnum.SINGLETON_INT;
    }
}
/** A singleton integer. */
export enum SingletonIntEnum {
    /** Elite! */
    SINGLETON_INT = 1337
}

/**
 * Verifies proper type handling through dynamic overrides.
 */
export class DataRenderer {
    constructor() { }

    public render(data: MyFirstStruct = { anumber: 42, astring: 'bazinga!' }): string {
        return this.renderMap(data);
    }

    public renderArbitrary(data: { [key: string]: any }): string {
        return this.renderMap(data);
    }

    public renderMap(map: { [key: string]: any }): string {
        return JSON.stringify(map, null, 2);
    }
}

export interface TopLevelStruct {
    /**
     * This is a required field
     */
    readonly required: string;

    /**
     * You don't have to pass this
     */
    readonly optional?: string;

    /**
     * A union to really stress test our serialization
     */
    readonly secondLevel: SecondLevelStruct | number;
}

export interface SecondLevelStruct {
    /**
     * It's long and required
     */
    readonly deeperRequiredProp: string;

    /**
     * It's long, but you'll almost never pass it.
     */
    readonly deeperOptionalProp?: string;
}

export interface DiamondInheritanceBaseLevelStruct {
    readonly baseLevelProperty: string;
}

export interface DiamondInheritanceFirstMidLevelStruct extends DiamondInheritanceBaseLevelStruct {
    readonly firstMidLevelProperty: string;
}

export interface DiamondInheritanceSecondMidLevelStruct extends DiamondInheritanceBaseLevelStruct {
    readonly secondMidLevelProperty: string;
}

export interface DiamondInheritanceTopLevelStruct extends DiamondInheritanceFirstMidLevelStruct, DiamondInheritanceSecondMidLevelStruct {
    readonly topLevelProperty: string;
}

export interface StructWithJavaReservedWords {
    readonly default: string;
    readonly assert?: string;

    // These properties are designed to break the naive implementation of equals() and hashcode() using the standard template
    readonly result?: string;
    readonly that?: string;
}

export class ClassWithJavaReservedWords {
    readonly int: string;

    public constructor(int: string) {
        this.int = int;
    }

    public import(assert: string): string {
        return this.int + assert;
    }
}

/**
 * Just because we can.
 *
 * @stability external
 */
export class StructPassing {
    public static roundTrip(_positional: number, input: TopLevelStruct): TopLevelStruct {
        return {
            required: input.required,
            optional: input.optional,
            secondLevel: input.secondLevel,
        };
    }

    public static howManyVarArgsDidIPass(_positional: number, ...inputs: TopLevelStruct[]): number {
        return inputs.length;
    }
}

/**
 * We can return arrays of interfaces
 * See aws/aws-cdk#2362
 */
export class InterfacesMaker {
    public static makeInterfaces(count: number): IDoublable[] {
        const output = new Array<IDoublable>();
        for (let i = 0; i < count; i++) {
            output.push({ doubleValue: i * 2 });
        }
        return output;
    }

    private constructor() { }
}

export class ClassWithCollections {
    public map: { [key: string]: string };
    public array: string[];

    public static staticMap:{ [key: string]: string } = {'key1': 'value1', 'key2': 'value2'};
    public static staticArray: string[] = ["one", "two"];

    constructor(map: { [key: string]: string }, array: string[]) {
        this.map = map;
        this.array = array;
    }

    static createAList(): string[] {
        return ["one", "two"];
    }

    static createAMap(): { [key: string]: string } {
        return {'key1': 'value1', 'key2': 'value2'};
    }
}

/**
 * @see https://github.com/aws/jsii/issues/903
 */
export class OverridableProtectedMember {
    protected readonly overrideReadOnly: string = 'Baz';
    protected overrideReadWrite: string = 'zinga!';

    public valueFromProtected(): string {
        return this.overrideMe();
    }

    public switchModes(): void {
        this.overrideReadWrite = 'zaar...';
    }

    protected overrideMe(): string {
        return this.overrideReadOnly + this.overrideReadWrite;
    }
}

/**
 * We can generate fancy builders in Java for classes which take a mix of positional & struct parameters
 */
export class SupportsNiceJavaBuilderWithRequiredProps {
    public readonly propId?: string;
    public readonly bar: number;

    /**
     * @param id    some identifier of your choice
     * @param props some properties
     */
    public constructor(public readonly id: number, props: SupportsNiceJavaBuilderProps) {
        this.propId = props.id;
        this.bar = props.bar;
    }
}
export class SupportsNiceJavaBuilder extends SupportsNiceJavaBuilderWithRequiredProps {
    public readonly rest: string[];

    /**
     *
     * @param id         some identifier
     * @param defaultBar the default value of `bar`
     * @param props      some props once can provide
     * @param rest       a variadic continuation
     */
    public constructor(public readonly id: number, defaultBar = 1337, props?: SupportsNiceJavaBuilderProps, ...rest: string[]) {
        super(id, props ?? { bar: defaultBar });
        this.rest = rest;
    }
}
export interface SupportsNiceJavaBuilderProps {
    /**
     * An `id` field here is terrible API design, because the constructor of `SupportsNiceJavaBuilder` already has a
     * parameter named `id`. But here we are, doing it like we didn't care.
     */
    readonly id?: string;

    /**
     * Some number, like 42.
     */
    readonly bar: number;
}

/**
 * We can return an anonymous interface implementation from an override without losing the interface
 * declarations.
 */
export interface IAnonymousImplementationProvider {
    provideAsInterface(): IAnonymouslyImplementMe;
    provideAsClass(): Implementation;
}
export class AnonymousImplementationProvider implements IAnonymousImplementationProvider {
    private readonly instance = new PrivateType();

    public provideAsClass(): Implementation {
        return this.instance;
    }

    public provideAsInterface(): IAnonymouslyImplementMe {
        return this.instance;
    }
}
export class Implementation {
    readonly value = 1337;
}
export interface IAnonymouslyImplementMe {
    readonly value: number;
    verb(): string;
}
class PrivateType extends Implementation implements IAnonymouslyImplementMe {
    public verb() {
        return 'to implement';
    }
}

/**
 * We can serialize and deserialize structs without silently ignoring optional fields.
 */
export interface StructA {
    readonly requiredString: string;
    readonly optionalString?: string;
    readonly optionalNumber?: number;
}
/**
 * This intentionally overlaps with StructA (where only requiredString is provided) to test htat
 * the kernel properly disambiguates those.
 */
export interface StructB {
    readonly requiredString: string;
    readonly optionalBoolean?: boolean;
    readonly optionalStructA?: StructA;
}
export class StructUnionConsumer {
    public static isStructA(struct: StructA | StructB): struct is StructA {
        const keys = new Set(Object.keys(struct));
        switch (keys.size) {
            case 1: return keys.has('requiredString');
            case 2: return keys.has('requiredString') && (keys.has('optionalNumber') || keys.has('optionalString'));
            case 3: return keys.has('requiredString') && keys.has('optionalNumber') && keys.has('optionalString');
            default: return false;
        }
    }

    public static isStructB(struct: StructA | StructB): struct is StructB {
        const keys = new Set(Object.keys(struct));
        switch (keys.size) {
            case 1: return keys.has('requiredString');
            case 2: return keys.has('requiredString') && (keys.has('optionalBoolean') || keys.has('optionalStructA'));
            case 3: return keys.has('requiredString') && keys.has('optionalBoolean') && keys.has('optionalStructA');
            default: return false;
        }
    }

    private constructor() { }
}


/**
 * Test calling back to consumers that implement interfaces
 *
 * Check that if a JSII consumer implements IConsumerWithInterfaceParam, they can call
 * the method on the argument that they're passed...
 */
export class ConsumerCanRingBell {
    /**
     * ...if the interface is implemented using an object literal.
     *
     * Returns whether the bell was rung.
     */
    public static staticImplementedByObjectLiteral(ringer: IBellRinger) {
        let rung = false;
        ringer.yourTurn({
            ring() {
                rung = true;
            }
        });
        return rung;
    }

    /**
     * ...if the interface is implemented using a public class.
     *
     * Return whether the bell was rung.
     */
    public static staticImplementedByPublicClass(ringer: IBellRinger) {
        const bell = new Bell();
        ringer.yourTurn(bell);
        return bell.rung;
    }

    /**
     * ...if the interface is implemented using a private class.
     *
     * Return whether the bell was rung.
     */
    public static staticImplementedByPrivateClass(ringer: IBellRinger) {
        const bell = new PrivateBell();
        ringer.yourTurn(bell);
        return bell.rung;
    }

    /**
     * If the parameter is a concrete class instead of an interface
     *
     * Return whether the bell was rung.
     */
    public static staticWhenTypedAsClass(ringer: IConcreteBellRinger) {
        const bell = new Bell();
        ringer.yourTurn(bell);
        return bell.rung;
    }
    /**
     * ...if the interface is implemented using an object literal.
     *
     * Returns whether the bell was rung.
     */
    public implementedByObjectLiteral(ringer: IBellRinger) {
        let rung = false;
        ringer.yourTurn({
            ring() {
                rung = true;
            }
        });
        return rung;
    }

    /**
     * ...if the interface is implemented using a public class.
     *
     * Return whether the bell was rung.
     */
    public implementedByPublicClass(ringer: IBellRinger) {
        const bell = new Bell();
        ringer.yourTurn(bell);
        return bell.rung;
    }

    /**
     * ...if the interface is implemented using a private class.
     *
     * Return whether the bell was rung.
     */
    public implementedByPrivateClass(ringer: IBellRinger) {
        const bell = new PrivateBell();
        ringer.yourTurn(bell);
        return bell.rung;
    }

    /**
     * If the parameter is a concrete class instead of an interface
     *
     * Return whether the bell was rung.
     */
    public whenTypedAsClass(ringer: IConcreteBellRinger) {
        const bell = new Bell();
        ringer.yourTurn(bell);
        return bell.rung;
    }
}

/**
 * Takes the object parameter as an interface
 */
export interface IBellRinger {
    yourTurn(bell: IBell): void;
}

/**
 * Takes the object parameter as a calss
 */
export interface IConcreteBellRinger {
    yourTurn(bell: Bell): void;
}

export interface IBell {
    ring(): void;
}

export class Bell implements IBell {
    public rung = false;

    public ring() {
        this.rung = true;
    }
}

class PrivateBell implements IBell {
    public rung = false;

    public ring() {
        this.rung = true;
    }
}

/**
 * This is here to check that we can pass a nested struct into a kwargs by specifying it as an
 * in-line dictionary. This is cheating with the (current) declared types, but this is the "more
 * idiomatic" way for Pythonists.
 */
export interface RootStruct {
    /**
     * May not be empty.
     */
    readonly stringProp: string;
    readonly nestedStruct?: NestedStruct;
}
export interface NestedStruct {
    /**
     * When provided, must be > 0.
     */
    readonly numberProp: number;
}
export class RootStructValidator {
    public static validate(struct: RootStruct): void {
        if (!struct.stringProp) {
            throw new Error('Missing required field: stringProp');
        }
        if (struct.nestedStruct) {
            if (struct.nestedStruct.numberProp <= 0) {
                throw new Error('numberProp must be > 0');
            }
        }
    }

    private constructor() { }
}

/**
 * Returns a subclass of a known class which implements an interface.
 */
export interface IReturnJsii976 {
    readonly foo: number;
}

export class BaseJsii976 { }

export class SomeTypeJsii976 {

    static returnReturn(): IReturnJsii976 {
        class Derived extends BaseJsii976 implements IReturnJsii976 {
            public readonly foo = 333
        }

        return new Derived();
    }

    static returnAnonymous(): any {
        class Derived implements IReturnJsii976 {
            public readonly foo = 1337;
        }

        return new Derived();
    }
}

/** https://github.com/aws/jsii/issues/982 */
export interface ParentStruct982 {
    readonly foo: string;
}
export interface ChildStruct982 extends ParentStruct982 {
    readonly bar: number;
}
/**
 * 1. call #takeThis() -> An ObjectRef will be provisioned for the value (it'll be re-used!)
 * 2. call #takeThisToo() -> The ObjectRef from before will need to be down-cased to the ParentStruct982 type
 */
export class Demonstrate982 {
    private static readonly value = {
        foo: 'foo',
        bar: 1337,
    };

    /** It's dangerous to go alone! */
    public static takeThis(): ChildStruct982 {
        return this.value;
    }

    /** It's dangerous to go alone! */
    public static takeThisToo(): ParentStruct982 {
        return this.value;
    }

    public constructor() { }
}

/**
 * Verifies that null/undefined can be returned for optional collections.
 *
 * This source of collections is disappointing - it'll always give you nothing :(
 */
export class DisappointingCollectionSource {
    /** Some List of strings, maybe? (Nah, just a billion dollars mistake!) */
    public static readonly maybeList?: string[] = undefined;
    /** Some Map of strings to numbers, maybe? (Nah, just a billion dollars mistake!) */
    public static readonly maybeMap?: { [key: string]: number } = undefined;

    private constructor() { }
}

/**
 * Make sure that setters are properly called on objects with interfaces
 */
export interface IObjectWithProperty {
    property: string;
    wasSet(): boolean;
}
export class ObjectWithPropertyProvider {
    public static provide(): IObjectWithProperty {
        class Impl implements IObjectWithProperty {
            private _property: string = '';
            private _wasSet = false;

            public get property() { return this._property; }
            public set property(value: string) {
                this._property = value;
                this._wasSet = true;
            }

            public wasSet() {
                return this._wasSet;
            }
        }
        return new Impl();
    }

    private constructor() { }
}

/**
 * Make sure structs are un-decorated on the way in.
 *
 * @see https://github.com/aws/aws-cdk/issues/5066
 */
export class JsonFormatter {
    public static stringify(value?: any): string | undefined {
        return JSON.stringify(value, null, 2);
    }

    public static anyNull(): any {
        return null;
    }

    public static anyUndefined(): any {
        return undefined;
    }

    public static anyFunction(): any {
        return () => 'boom';
    }

    public static anyDate(): any {
        return new Date('2019-11-18T13:01:20.515Z');
    }

    public static anyNumber(): any {
        return 123;
    }

    public static anyZero(): any {
        return 0;
    }

    public static anyString(): any {
        return 'foo';
    }

    public static anyEmptyString(): any {
        return '';
    }

    public static anyBooleanTrue(): any {
        return true;
    }

    public static anyBooleanFalse(): any {
        return false;
    }

    public static anyArray(): any {
        return [ 1, 2, 3, new Number(123), { foo: 'bar' } ];
    }

    public static anyHash(): any {
        return { hello: 1234, world: new Number(122) };
    }

    public static anyRef(): any {
        return new Number(444);
    }

    private constructor() { }
}

/**
 * This tries to confuse Jackson by having overloaded property setters.
 *
 * @see https://github.com/aws/aws-cdk/issues/4080
 */
export class ConfusingToJackson {
    public static makeInstance(): ConfusingToJackson {
        return new ConfusingToJackson();
    }

    public static makeStructInstance(): ConfusingToJacksonStruct {
        return {};
    }

    public unionProperty?: Array<IFriendly | AbstractClass> | IFriendly;

    private constructor() { }
}
export interface ConfusingToJacksonStruct {
    readonly unionProperty?: Array<IFriendly | AbstractClass> | IFriendly;
}

/**
 * Verifies that a "pure" implementation of an interface works correctly
 */
export interface IStructReturningDelegate {
    returnStruct(): StructB;
}
export class ConsumePureInterface {
    constructor(private readonly delegate: IStructReturningDelegate) { }

    public workItBaby() {
        return this.delegate.returnStruct();
    }
}

/**
 * Verifies that, in languages that do keyword lifting (e.g: Python), having a
 * struct member with the same name as a positional parameter results in the
 * correct code being emitted.
 *
 * See: https://github.com/aws/aws-cdk/issues/4302
 */
export interface StructParameterType {
    readonly scope: string;
    readonly props?: boolean;
}
export class AmbiguousParameters {
    public constructor(public readonly scope: Bell, public readonly props: StructParameterType) { }
}

/**
 * Verifies that collections of interfaces or structs are correctly handled.
 *
 * See: https://github.com/aws/jsii/issues/1196
 */
export class InterfaceCollections {
  public static listOfStructs(): StructA[] {
    return [
      { requiredString: 'Hello, I\'m String!' }
    ];
  }

  public static mapOfStructs(): { [name: string]: StructA } {
    return {
      A: { requiredString: 'Hello, I\'m String!' }
    };
  }

  public static listOfInterfaces(): IBell[] {
    return [
      { ring: () => { return; } }
    ];
  }

  public static mapOfInterfaces(): { [name: string]: IBell } {
    return {
      A: { ring: () => { return; } }
    };
  }

  private constructor(){ }
}

/**
 * Checks that optional result from interface method code generates correctly
 */
export interface IOptionalMethod {
    optional(): string | undefined;
}

/**
 * Checks the "same instance" isomorphism is preserved within the constructor.
 *
 * Create a subclass of this, and assert that `this.myself()` actually returns
 * `this` from within the constructor.
 */
export abstract class Isomorphism {
    public myself(): Isomorphism {
        return this;
    }
}

/**
 * Checks the current file permissions are cool (no funky UMASK down-scoping happened)
 *
 * @see https://github.com/aws/jsii/issues/1765
 */
export class UmaskCheck {
    /**
     * This should return 0o644 (-rw-r--r--)
     */
    public static mode(): number {
        // The bit-masking is to remove the file type information from .mode
        return fs.statSync(__filename).mode & 0o0777;
    }

    private constructor() {}
}
