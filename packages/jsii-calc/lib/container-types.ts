export class ClassWithContainerTypes {
  public constructor(
    public readonly array: DummyObj[],
    public readonly record: Record<string, DummyObj>,
    public readonly obj: { [key: string]: DummyObj },
    public readonly props?: ContainerProps,
  ) {}
}

export interface ContainerProps {
  readonly arrayProp: DummyObj[];
  readonly recordProp: Record<string, DummyObj>;
  readonly objProp: { [key: string]: DummyObj };
}

export interface DummyObj {
  readonly example: string;
}
