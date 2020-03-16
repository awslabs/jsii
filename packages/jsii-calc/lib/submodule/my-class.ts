import { nested_submodule } from './nested_submodule';
import { Goodness } from './child';

export class MyClass implements nested_submodule.deeplyNested.INamespaced {
  public readonly definedAt = __filename;

  public readonly goodness = Goodness.AMAZINGLY_GOOD;

  public constructor() { }
}
