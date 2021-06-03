// member has the same name as a base class
// @see https://github.com/aws/jsii/issues/2702

import { Base, IBaseInterface } from '@scope/jsii-calc-base';

export class Class1 extends Base {
  public base() {
    return;
  }
}

export class Class2 extends Base {
  public readonly base = 'hello';
}

export class Class3 implements IBaseInterface {
  public bar(): void {
    return;
  }

  public foo(): void {
    return;
  }

  public iBaseInterface() {
    return;
  }
}

export interface IFoo extends IBaseInterface {
  readonly iBaseInterface: string;
}

// See https://github.com/aws/aws-cdk/issues/13474

export interface IConstruct {
  constructMethod(): void;
}

export interface IResource extends IConstruct {
  resourceMethod(): void;
}

export interface IVpc extends IResource {
  vpcMethod(): void;
}

export class Construct implements IConstruct {
  public constructMethod(): void {
    return;
  }
}

export abstract class Resource extends Construct implements IResource {
  public resourceMethod(): void {
    return;
  }
}

export class Vpc extends Resource implements IVpc {
  public vpcMethod(): void {
    return;
  }
}

export interface IBaz extends IBaseInterface {
  bazMethod(): void;
}

export class Baz extends Class3 implements IBaz {
  public bazMethod(): void {
    return;
  }
}
