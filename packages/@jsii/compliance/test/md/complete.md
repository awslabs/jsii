# Complete

## Description

This file definitely contains a test suite that corresponds to the standard
schema defined in the specification document.

## Test Suite

### Category 1

This is the description of Category 1. It's pretty neat all around, just tests
stuff. You'll see it's fun.

> :warning: it may actually not test anything useful... sorry. It's only here
> for shows!

#### Test A

This test verifies that we can correcly parse test cases when they're written
in the canonical way (canonical form, then kernel trace).

```ts
expect('canonical-form').toBeTruthy();
```

```
# Yap, that's not actually a correct hello message even!
> { "hello": "world!" }
```

#### Test B

Here, we verify that we're totally able to parse multiple tests within the same
category... It'd be a lot less useful if categories could only ever contain a
single test case!

> We're also intentionally switching the canonical form and the kernel trace
> here. Why? Because we can.

```
> { "hello": "world!" }
# Yap, was not actually a correct hello message even!
```

```ts
expect(category('Category 1').testCases.length).toBe(2);
```

### Category 2

Now, same as it's clearly more useful when categories can contain multiple test
cases; it's more useful if there can be more than one section... So here we are!

#### Test A

We also check that we can use the same test name within different categories.
Naming is hard, so naming in a global namespace is nearly impossible!

```ts
expect(false).not.toBeTruthy();
```

```
> { "hello": "It's me..." }
# I've been wondering if after all these years...
```
