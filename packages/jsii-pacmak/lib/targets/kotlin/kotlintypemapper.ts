import * as spec from '@jsii/spec';
import { isUnionTypeReference } from '@jsii/spec';
import * as reflect from 'jsii-reflect';
import { TypeSystem } from 'jsii-reflect';

import { KotlinPlatform } from './kotlingeneratorconfiguration';

export class KotlinTypeMapper {
  public static getPackageName(assembly: reflect.Assembly): string | undefined {
    return assembly.targets?.kotlin?.package;
  }

  public static mapReferenceName(fqn: string, system: TypeSystem): string {
    const [assemblyName, ...remainingNameChunks] = fqn.split('.');
    const nameInAssembly = remainingNameChunks.join('.');
    const assembly = system.findAssembly(assemblyName);
    const packageName = KotlinTypeMapper.getPackageName(assembly);
    if (packageName) {
      return `${packageName}.${nameInAssembly}`;
    }

    return nameInAssembly;
  }

  public static isCollectionType(ref: reflect.TypeReference): boolean {
    return spec.isCollectionTypeReference(ref.spec);
  }

  public constructor(private readonly platform: KotlinPlatform) {}

  public mapOptional(
    value: reflect.OptionalValue,
    isNullable: boolean = value.optional,
  ): string {
    const type = this.mapTypeReference(value.type);
    const nullabilityMarker = isNullable ? '?' : '';
    return `${type}${nullabilityMarker}`;
  }

  public mapTypeReference(
    ref: reflect.TypeReference,
    mapArguments = true,
  ): string {
    if (ref.void) {
      return 'kotlin.Unit';
    }
    return this.mapSpecTypeReference(ref.spec, ref.system, mapArguments);
  }

  public mapReferenceType(type: reflect.ReferenceType): string {
    return KotlinTypeMapper.mapReferenceName(type.fqn, type.system);
  }

  public mapEnumType(type: reflect.EnumType): string {
    return KotlinTypeMapper.mapReferenceName(type.fqn, type.system);
  }

  private mapSpecTypeReference(
    ref: spec.TypeReference | undefined,
    system: TypeSystem,
    mapArguments: boolean,
  ): string {
    if (spec.isPrimitiveTypeReference(ref)) {
      return this.mapPrimitiveType(ref.primitive);
    } else if (spec.isCollectionTypeReference(ref)) {
      return this.mapCollectionType(ref, system, mapArguments);
    } else if (spec.isNamedTypeReference(ref)) {
      return KotlinTypeMapper.mapReferenceName(ref.fqn, system);
    } else if (isUnionTypeReference(ref)) {
      return this.mapUnionType(ref);
    }

    throw new Error(`Unexpected type reference kind: ${ref}`);
  }

  private mapPrimitiveType(primitive: spec.PrimitiveType): string {
    const platform = this.platform;

    function unsupportedPlatform(): never {
      throw new Error(`${primitive} type is unsupported on ${platform}`);
    }

    switch (primitive) {
      case spec.PrimitiveType.Boolean:
        return 'kotlin.Boolean';
      case spec.PrimitiveType.Number:
        return 'kotlin.Number';
      case spec.PrimitiveType.String:
        return 'kotlin.String';
      case spec.PrimitiveType.Any:
        return 'kotlin.Any';
      case spec.PrimitiveType.Date: {
        switch (platform) {
          case KotlinPlatform.JVM:
            return 'java.time.Instant';
          default:
            return unsupportedPlatform();
        }
      }
      case spec.PrimitiveType.Json: {
        switch (platform) {
          case KotlinPlatform.JVM:
            return 'com.fasterxml.jackson.databind.node.ObjectNode';
          default:
            return unsupportedPlatform();
        }
      }
      default:
        throw new Error(`Unknown primitive type: ${primitive as any}`);
    }
  }

  private mapCollectionType(
    ref: spec.CollectionTypeReference,
    system: TypeSystem,
    mapArguments: boolean,
  ): string {
    const elementType = this.mapSpecTypeReference(
      ref.collection.elementtype,
      system,
      mapArguments,
    );
    const kind = ref.collection.kind;
    switch (kind) {
      case spec.CollectionKind.Array:
        const arrayType = 'kotlin.collections.List';
        return mapArguments ? `${arrayType}<${elementType}>` : arrayType;
      case spec.CollectionKind.Map:
        const mapType = 'kotlin.collections.Map';
        return mapArguments
          ? `${mapType}<kotlin.String, ${elementType}>`
          : mapType;
      default:
        throw new Error(`Unsupported collection kind: ${kind as any}`);
    }
  }

  private mapUnionType(_ref: spec.UnionTypeReference): string {
    // TODO find common supertype
    return 'kotlin.Any';
  }
}
