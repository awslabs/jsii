import * as Case from 'case';
import * as spec from '@jsii/spec';
import * as ts from 'typescript';
import { Emitter } from './emitter';
import { JsiiDiagnostic } from './jsii-diagnostic';
import { ProjectInfo } from './project-info';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import deepEqual = require('deep-equal');

export class Validator implements Emitter {
  public static VALIDATIONS: ValidationFunction[] = _defaultValidations();

  private _diagnostics = new Array<JsiiDiagnostic>();

  public constructor(
    public readonly projectInfo: ProjectInfo,
    public readonly assembly: spec.Assembly,
  ) {}

  public async emit(): Promise<ts.EmitResult> {
    this._diagnostics = [];

    try {
      for (const validation of Validator.VALIDATIONS) {
        validation(this, this.assembly, (diag) => this._diagnostics.push(diag));
      }

      return Promise.resolve({
        diagnostics: this._diagnostics,
        emitSkipped: this._diagnostics.some(
          (diag) => diag.category === ts.DiagnosticCategory.Error,
        ),
      });
    } finally {
      // Clearing ``this._diagnostics`` to allow contents to be garbage-collected.
      this._diagnostics = [];
    }
  }
}

export type DiagnosticEmitter = (diag: JsiiDiagnostic) => void;
export type ValidationFunction = (
  validator: Validator,
  assembly: spec.Assembly,
  diagnostic: DiagnosticEmitter,
) => void;

function _defaultValidations(): ValidationFunction[] {
  return [
    _typeNamesMustUsePascalCase,
    _enumMembersMustUserUpperSnakeCase,
    _memberNamesMustUseCamelCase,
    _staticConstantNamesMustUseUpperSnakeCase,
    _memberNamesMustNotLookLikeJavaGettersOrSetters,
    _allTypeReferencesAreValid,
    _inehritanceDoesNotChangeContracts,
  ];

  function _typeNamesMustUsePascalCase(
    _: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const type of _allTypes(assembly)) {
      if (type.name !== Case.pascal(type.name)) {
        diagnostic(
          JsiiDiagnostic.JSII_8000_PASCAL_CASED_TYPE_NAMES.createDetached(
            type.name,
          ),
        );
      }
    }
  }

  function _enumMembersMustUserUpperSnakeCase(
    _: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const type of _allTypes(assembly)) {
      if (!spec.isEnumType(type)) {
        continue;
      }

      for (const member of type.members) {
        if (member.name && member.name !== Case.constant(member.name)) {
          diagnostic(
            JsiiDiagnostic.JSII_8001_ALL_CAPS_ENUM_MEMBERS.createDetached(
              member.name,
              type.fqn,
            ),
          );
        }
      }
    }
  }

  function _memberNamesMustUseCamelCase(
    _: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const { member, type } of _allMembers(assembly)) {
      if (member.static && (member as spec.Property).const) {
        continue;
      }
      if (member.name && member.name !== Case.camel(member.name)) {
        diagnostic(
          JsiiDiagnostic.JSII_8002_CAMEL_CASED_MEMBERS.createDetached(
            member.name,
            type.fqn,
          ),
        );
      }
    }
  }

  function _staticConstantNamesMustUseUpperSnakeCase(
    _: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const { member, type } of _allMembers(assembly)) {
      if (!member.static || !(member as spec.Property).const) {
        continue;
      }
      if (
        member.name &&
        member.name !== Case.constant(member.name) &&
        member.name !== Case.pascal(member.name) &&
        member.name !== Case.camel(member.name)
      ) {
        diagnostic(
          JsiiDiagnostic.JSII_8003_STATIC_CONST_CASING.createDetached(
            member.name,
            type.name,
          ),
        );
      }
    }
  }

  function _memberNamesMustNotLookLikeJavaGettersOrSetters(
    _: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const { member, type } of _allMembers(assembly)) {
      if (!member.name) {
        continue;
      }
      const snakeName = Case.snake(member.name);
      if (
        snakeName.startsWith('get_') &&
        _isEmpty((member as spec.Method).parameters)
      ) {
        diagnostic(
          JsiiDiagnostic.JSII_5000_JAVA_GETTERS.createDetached(
            member.name,
            type.name,
          ),
        );
      } else if (
        snakeName.startsWith('set_') &&
        ((member as spec.Method).parameters ?? []).length === 1
      ) {
        diagnostic(
          JsiiDiagnostic.JSII_5001_JAVA_SETTERS.createDetached(
            member.name,
            type.name,
          ),
        );
      }
    }
  }

  function _allTypeReferencesAreValid(
    validator: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const typeRef of _allTypeReferences(assembly)) {
      const [assm] = typeRef.fqn.split('.');
      if (assembly.name === assm) {
        if (!(typeRef.fqn in (assembly.types ?? {}))) {
          diagnostic(
            JsiiDiagnostic.JSII_3000_EXPORTED_API_USES_HIDDEN_TYPE.createDetached(
              typeRef.fqn,
            ),
          );
        }
        continue;
      }
      const foreignAssm = validator.projectInfo.dependencyClosure.find(
        (dep) => dep.name === assm,
      );
      if (!foreignAssm) {
        diagnostic(
          JsiiDiagnostic.JSII_9000_UNKNOWN_MODULE.createDetached(assm),
        );
        continue;
      }
      if (!(typeRef.fqn in (foreignAssm.types ?? {}))) {
        diagnostic(
          JsiiDiagnostic.JSII_9001_TYPE_NOT_FOUND.createDetached(typeRef),
        );
      }
    }
  }

  function _inehritanceDoesNotChangeContracts(
    validator: Validator,
    assembly: spec.Assembly,
    diagnostic: DiagnosticEmitter,
  ) {
    for (const type of _allTypes(assembly)) {
      if (spec.isClassType(type)) {
        for (const method of type.methods ?? []) {
          _validateMethodOverride(method, type);
        }
        for (const property of type.properties ?? []) {
          _validatePropertyOverride(property, type);
        }
      }
      if (
        spec.isClassOrInterfaceType(type) &&
        (type.interfaces?.length ?? 0) > 0
      ) {
        for (const method of type.methods ?? []) {
          // Overrides "win" over implementations
          if (method.overrides) {
            continue;
          }
          _validateMethodImplementation(method, type);
        }
        for (const property of type.properties ?? []) {
          _validatePropertyImplementation(property, type);
        }
      }
    }

    function _validateMethodOverride(
      method: spec.Method,
      type: spec.ClassType,
    ): boolean {
      if (!type.base) {
        return false;
      }
      const baseType = _dereference(
        type.base,
        assembly,
        validator,
      ) as spec.ClassType;
      if (!baseType) {
        return false;
      }
      const overridden = (baseType.methods ?? []).find(
        (m) => m.name === method.name,
      );
      if (!overridden) {
        return _validateMethodOverride(method, baseType);
      }
      _assertSignaturesMatch(
        overridden,
        method,
        `${type.fqn}#${method.name}`,
        `overriding ${baseType.fqn}`,
      );
      method.overrides = baseType.fqn;
      return true;
    }

    function _validatePropertyOverride(
      property: spec.Property,
      type: spec.ClassType,
    ): boolean {
      if (!type.base) {
        return false;
      }
      const baseType = _dereference(
        type.base,
        assembly,
        validator,
      ) as spec.ClassType;
      if (!baseType) {
        return false;
      }
      const overridden = (baseType.properties ?? []).find(
        (p) => p.name === property.name,
      );
      if (!overridden) {
        return _validatePropertyOverride(property, baseType);
      }
      _assertPropertiesMatch(
        overridden,
        property,
        `${type.fqn}#${property.name}`,
        `overriding ${baseType.fqn}`,
      );
      property.overrides = baseType.fqn;
      return true;
    }

    function _validateMethodImplementation(
      method: spec.Method,
      type: spec.ClassType | spec.InterfaceType,
    ): boolean {
      if (!type.interfaces) {
        // Abstract classes may not directly implement all members, need to check their supertypes...
        if (spec.isClassType(type) && type.base && type.abstract) {
          return _validateMethodImplementation(
            method,
            _dereference(type.base, assembly, validator) as spec.ClassType,
          );
        }
        return false;
      }
      for (const iface of type.interfaces) {
        const ifaceType = _dereference(
          iface,
          assembly,
          validator,
        ) as spec.InterfaceType;
        const implemented = (ifaceType.methods ?? []).find(
          (m) => m.name === method.name,
        );
        if (implemented) {
          _assertSignaturesMatch(
            implemented,
            method,
            `${type.fqn}#${method.name}`,
            `implementing ${ifaceType.fqn}`,
          );
          method.overrides = iface;
          return true;
        }
        if (_validateMethodImplementation(method, ifaceType)) {
          return true;
        }
      }
      return false;
    }

    function _validatePropertyImplementation(
      property: spec.Property,
      type: spec.ClassType | spec.InterfaceType,
    ): boolean {
      if (!type.interfaces) {
        // Abstract classes may not directly implement all members, need to check their supertypes...
        if (spec.isClassType(type) && type.base && type.abstract) {
          return _validatePropertyImplementation(
            property,
            _dereference(type.base, assembly, validator) as spec.ClassType,
          );
        }
        return false;
      }
      for (const iface of type.interfaces) {
        const ifaceType = _dereference(
          iface,
          assembly,
          validator,
        ) as spec.InterfaceType;
        const implemented = (ifaceType.properties ?? []).find(
          (p) => p.name === property.name,
        );
        if (implemented) {
          _assertPropertiesMatch(
            implemented,
            property,
            `${type.fqn}#${property.name}`,
            `implementing ${ifaceType.fqn}`,
          );
          property.overrides = ifaceType.fqn;
          return true;
        }
        if (_validatePropertyImplementation(property, ifaceType)) {
          return true;
        }
      }
      return false;
    }

    function _assertSignaturesMatch(
      expected: spec.Method,
      actual: spec.Method,
      label: string,
      action: string,
    ) {
      if (!!expected.protected !== !!actual.protected) {
        const expVisibility = expected.protected ? 'protected' : 'public';
        const actVisibility = actual.protected ? 'protected' : 'public';
        diagnostic(
          JsiiDiagnostic.JSII_5002_OVERRIDE_CHANGES_VISIBILITY.createDetached(
            label,
            action,
            actVisibility,
            expVisibility,
          ),
        );
      }
      if (!deepEqual(actual.returns, expected.returns)) {
        const expType = spec.describeTypeReference(expected.returns?.type);
        const actType = spec.describeTypeReference(actual.returns?.type);
        diagnostic(
          JsiiDiagnostic.JSII_5003_OVERRIDE_CHANGES_RETURN_TYPE.createDetached(
            label,
            action,
            actType,
            expType,
          ),
        );
      }
      const expectedParams = expected.parameters ?? [];
      const actualParams = actual.parameters ?? [];
      if (expectedParams.length !== actualParams.length) {
        diagnostic(
          JsiiDiagnostic.JSII_5005_OVERRIDE_CHANGES_PARAM_COUNT.createDetached(
            label,
            action,
            actualParams.length,
            expectedParams.length,
          ),
        );
        return;
      }
      for (let i = 0; i < expectedParams.length; i++) {
        const expParam = expectedParams[i];
        const actParam = actualParams[i];
        if (!deepEqual(expParam.type, actParam.type)) {
          diagnostic(
            JsiiDiagnostic.JSII_5006_OVERRIDE_CHANGES_PARAM_TYPE.createDetached(
              label,
              action,
              actParam,
              expParam,
            ),
          );
        }
        // Not-ing those to force the values to a strictly boolean context (they're optional, undefined means false)
        if (expParam.variadic !== actParam.variadic) {
          diagnostic(
            JsiiDiagnostic.JSII_5007_OVERRIDE_CHANGES_VARIADIC.createDetached(
              label,
              action,
              actParam.variadic,
              expParam.variadic,
            ),
          );
        }
        if (expParam.optional !== actParam.optional) {
          diagnostic(
            JsiiDiagnostic.JSII_5008_OVERRIDE_CHANGES_PARAM_OPTIONAL.createDetached(
              label,
              action,
              actParam,
              expParam,
            ),
          );
        }
      }
    }

    function _assertPropertiesMatch(
      expected: spec.Property,
      actual: spec.Property,
      label: string,
      action: string,
    ) {
      if (!!expected.protected !== !!actual.protected) {
        const expVisibility = expected.protected ? 'protected' : 'public';
        const actVisibility = actual.protected ? 'protected' : 'public';
        diagnostic(
          JsiiDiagnostic.JSII_5002_OVERRIDE_CHANGES_VISIBILITY.createDetached(
            label,
            action,
            actVisibility,
            expVisibility,
          ),
        );
      }
      if (!deepEqual(expected.type, actual.type)) {
        diagnostic(
          JsiiDiagnostic.JSII_5004_OVERRIDE_CHANGES_PROP_TYPE.createDetached(
            label,
            action,
            actual.type,
            expected.type,
          ),
        );
      }
      if (expected.immutable !== actual.immutable) {
        diagnostic(
          JsiiDiagnostic.JSII_5010_OVERRIDE_CHANGES_MUTABILITY.createDetached(
            label,
            action,
            actual.immutable,
            expected.immutable,
          ),
        );
      }
      if (expected.optional !== actual.optional) {
        diagnostic(
          JsiiDiagnostic.JSII_5009_OVERRIDE_CHANGES_PROP_OPTIONAL.createDetached(
            label,
            action,
            actual.optional,
            expected.optional,
          ),
        );
      }
    }
  }
}

function _allTypes(assm: spec.Assembly): spec.Type[] {
  return Object.values(assm.types ?? {});
}

function _allMethods(
  assm: spec.Assembly,
): Array<{ member: spec.Method; type: spec.Type }> {
  const methods = new Array<{ member: spec.Method; type: spec.Type }>();
  for (const type of _allTypes(assm)) {
    if (!spec.isClassOrInterfaceType(type)) {
      continue;
    }
    if (!type.methods) {
      continue;
    }
    type.methods.forEach((method) => methods.push({ member: method, type }));
  }
  return methods;
}

function _allProperties(
  assm: spec.Assembly,
): Array<{ member: spec.Property; type: spec.Type }> {
  const properties = new Array<{ member: spec.Property; type: spec.Type }>();
  for (const type of _allTypes(assm)) {
    if (!spec.isClassOrInterfaceType(type)) {
      continue;
    }
    if (!type.properties) {
      continue;
    }
    type.properties.forEach((property) =>
      properties.push({ member: property, type }),
    );
  }
  return properties;
}

function _allMembers(
  assm: spec.Assembly,
): Array<{ member: spec.Property | spec.Method; type: spec.Type }> {
  return [..._allMethods(assm), ..._allProperties(assm)];
}

function _allTypeReferences(assm: spec.Assembly): spec.NamedTypeReference[] {
  const typeReferences = new Array<spec.NamedTypeReference>();
  for (const type of _allTypes(assm)) {
    if (!spec.isClassOrInterfaceType(type)) {
      continue;
    }
    if (spec.isClassType(type) && type.base) {
      typeReferences.push({ fqn: type.base });
    }
    if (type.interfaces) {
      type.interfaces.forEach((iface) => typeReferences.push({ fqn: iface }));
    }
  }
  for (const { member: prop } of _allProperties(assm)) {
    _collectTypeReferences(prop.type);
  }
  for (const { member: meth } of _allMethods(assm)) {
    if (meth.returns) {
      _collectTypeReferences(meth.returns.type);
    }
    for (const param of meth.parameters ?? []) {
      _collectTypeReferences(param.type);
    }
  }
  return typeReferences;

  function _collectTypeReferences(type: spec.TypeReference): void {
    if (spec.isNamedTypeReference(type)) {
      typeReferences.push(type);
    } else if (spec.isCollectionTypeReference(type)) {
      _collectTypeReferences(type.collection.elementtype);
    } else if (spec.isUnionTypeReference(type)) {
      type.union.types.forEach(_collectTypeReferences);
    }
  }
}

function _dereference(
  typeRef: string | spec.NamedTypeReference,
  assembly: spec.Assembly,
  validator: Validator,
): spec.Type | undefined {
  if (typeof typeRef !== 'string') {
    typeRef = typeRef.fqn;
  }
  const [assm] = typeRef.split('.');
  if (assembly.name === assm) {
    return assembly.types?.[typeRef];
  }
  const foreignAssm = validator.projectInfo.dependencyClosure.find(
    (dep) => dep.name === assm,
  );
  return foreignAssm?.types?.[typeRef];
}

function _isEmpty(array: undefined | any[]): array is undefined {
  return array == null || array.length === 0;
}
