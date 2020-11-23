import { Assembly } from 'jsii-reflect';

import { KotlinNamer } from './kotlinnamer';
import { KotlinTypeMapper } from './kotlintypemapper';

export class KotlinGeneratorConfiguration {
  public static of(
    assembly: Assembly,
    fingerprint: boolean,
  ): KotlinGeneratorConfiguration {
    const platform = KotlinPlatform.JVM;
    const kotlinTarget = KotlinGeneratorConfiguration.findKotlinTarget(
      assembly,
    );
    const kotlinVersion = (kotlinTarget && kotlinTarget.version) || '1.3.50';

    const packageName = kotlinTarget && kotlinTarget.package;
    if (!packageName) {
      throw new Error(
        `Kotlin package name not specified for assembly ${assembly.name}`,
      );
    }

    const artifact = KotlinGeneratorConfiguration.buildArtifactConfiguration(
      kotlinTarget,
      assembly.version,
    );
    return new KotlinGeneratorConfiguration(
      platform,
      kotlinVersion,
      packageName,
      artifact,
      fingerprint,
    );
  }

  public static buildAssemblyArtifactConfiguration(
    assembly: Assembly,
  ): KotlinArtifactConfiguration | undefined {
    const kotlinTarget = KotlinGeneratorConfiguration.findKotlinTarget(
      assembly,
    );
    if (!kotlinTarget) {
      return undefined;
    }
    return KotlinGeneratorConfiguration.buildArtifactConfiguration(
      kotlinTarget,
      assembly.version,
    );
  }

  public static buildArtifactConfiguration(
    target: any,
    version: string,
  ): KotlinArtifactConfiguration | undefined {
    const groupId = target.maven && target.maven.groupId;
    const artifactId = target.maven && target.maven.artifactId;
    const versionSuffix = target.maven && target.maven.versionSuffix;
    if (groupId && artifactId) {
      const fullVersion = KotlinGeneratorConfiguration.buildVersion(
        version,
        versionSuffix,
      );
      return new KotlinArtifactConfiguration(groupId, artifactId, fullVersion);
    }

    return undefined;
  }

  private static buildVersion(version: string, suffix?: string): string {
    return suffix ? `${version}${suffix}` : version;
  }

  private static findKotlinTarget(assembly: Assembly): any | undefined {
    return assembly.targets && assembly.targets.kotlin;
  }

  public readonly typeMapper: KotlinTypeMapper;
  public readonly namer: KotlinNamer;

  public constructor(
    public readonly platform: KotlinPlatform,
    public readonly kotlinVersion: string,
    public readonly packageName: string,
    public readonly artifact: KotlinArtifactConfiguration | undefined,
    public readonly fingerprint: boolean,
  ) {
    this.typeMapper = new KotlinTypeMapper(platform);
    this.namer = new KotlinNamer();
  }
}

export class KotlinArtifactConfiguration {
  public constructor(
    public readonly groupId: string,
    public readonly artifactId: string,
    public readonly version: string,
  ) {}

  public get dependency(): string {
    return `${this.groupId}:${this.artifactId}:${this.version}`;
  }
}

export enum KotlinPlatform {
  JVM,
}
