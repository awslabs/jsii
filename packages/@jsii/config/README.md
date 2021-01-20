# `@jsii/config`

> :warning: This package should be treated as an internal component of tools in
> the `jsii` ecocystem. It's API may change without warning on any new release.

This package centralizes the logic used by other projects in the `jsii` family
to access the configuration of `jsii` projects in a consistent manner.

That configuration can be hosted in either of these places (**not both**):

- In the `package.json` file, under the `"jsii"` key. This is the historical
  way `jsii` projects were configured, but does not allow a lot of user control
  on the TypeScript compiler configuration.

- In the `tsconfig.json` file, under the `"x-jsii"` key. This is the modern way
  `jsii` projects are configured, and allow as much user control on the
  TypeScript compiler configuration as possible, as the user owns it.

## Usage

```ts
import { load } from '@jsii/config';

// The root directory of a jsii project
declare projectRoot: string:

const configuration = load(projectRoot);
// Work with the configuration...
```
