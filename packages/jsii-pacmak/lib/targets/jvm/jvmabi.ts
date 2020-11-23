import * as spec from '@jsii/spec';

class JsiiObject {
  public readonly type = 'software.amazon.jsii.JsiiObject';
  public readonly ref = 'software.amazon.jsii.JsiiObjectRef';
  public readonly initializationMode = `${this.type}.InitializationMode`;

  public readonly getMethod = 'jsiiGet';
  public readonly staticGetMethod = 'jsiiStaticGet';
  public readonly staticSetMethod = 'jsiiStaticSet';
  public readonly staticCallMethod = 'jsiiStaticCall';
  public readonly setMethod = 'jsiiSet';
  public readonly callMethod = 'jsiiCall';
  public readonly asyncCallMethod = 'jsiiAsyncCall';
}

class JsiiObjectMapper {
  public readonly toJsonMethod = '$jsii$toJson';

  public readonly type = 'software.amazon.jsii.JsiiObjectMapper';
  public readonly instance = `${this.type}.INSTANCE`;
}

class Jackson {
  public readonly jsonNode = 'com.fasterxml.jackson.databind.JsonNode';
  public readonly objectMapper = 'com.fasterxml.jackson.databind.ObjectMapper';
  public readonly objectNode = 'com.fasterxml.jackson.databind.node.ObjectNode';

  public readonly nodeFactory =
    'com.fasterxml.jackson.databind.node.JsonNodeFactory';
  public readonly newObjectNode = `${this.nodeFactory}.instance.objectNode`;
}

export class JvmAbi {
  public static readonly jsiiAnnotation = 'software.amazon.jsii.Jsii';
  public static readonly jsiiModule = 'software.amazon.jsii.JsiiModule';
  public static readonly jsiiEngine = 'software.amazon.jsii.JsiiEngine';

  public static readonly moduleName = '$Module';
  public static readonly proxyName = 'Jsii$Proxy';

  public static readonly jsiiObject = new JsiiObject();
  public static readonly jsiiObjectMapper = new JsiiObjectMapper();

  public static readonly jackson = new Jackson();

  public static readonly stabilityAnnotationType =
    'software.amazon.jsii.Stability';

  public static getStabilityLevelName(stability: spec.Stability): string {
    switch (stability) {
      case spec.Stability.Deprecated:
        return 'Deprecated';
      case spec.Stability.Experimental:
        return 'Experimental';
      case spec.Stability.External:
        return 'External';
      case spec.Stability.Stable:
        return 'Stable';
      default:
        throw new Error(`Unexpected stability: ${stability as any}`);
    }
  }

  private constructor() {}
}
