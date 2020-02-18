export interface TestSuite {
  [category: string]: TestCategory;
}

export interface TestCategory {
  description: string;
  testCases: { [name: string]: TestCase };
}

export interface TestCase {
  description: string;
  canonicalForm: string;
  kernelTrace: readonly KernelTraceEntry[];
}

export interface KernelTraceEntry {
  direction: MessageDirection;
  message: { [key: string]: any };
}

export enum MessageDirection {
  HostToKernel = 'HOST_TO_KERNEL',
  KernelToHost = 'KERNEL_TO_HOST',
}
