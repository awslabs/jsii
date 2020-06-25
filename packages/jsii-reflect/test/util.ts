// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { sourceToAssemblyHelper } from 'jsii/lib/helpers';
import { Assembly, TypeSystem } from '../lib';

export async function typeSystemFromSource(source: string) {
  const assembly = await sourceToAssemblyHelper(source);
  const ts = new TypeSystem();
  ts.addAssembly(new Assembly(ts, assembly));
  return ts;
}
