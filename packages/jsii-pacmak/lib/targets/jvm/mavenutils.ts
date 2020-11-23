import * as xmlbuilder from 'xmlbuilder';

import * as logging from '../../logging';
import { PackageInfo } from '../../target';

export function getJvmPackageInfos(
  language: string,
  groupId: string,
  artifactId: string,
  version: string,
): { [language: string]: PackageInfo } {
  const url = `https://repo1.maven.org/maven2/${groupId.replace(
    /\./g,
    '/',
  )}/${artifactId}/${version}/`;
  const result: { [language: string]: PackageInfo } = {};
  result[language] = {
    repository: 'Maven Central',
    url,
    usage: {
      'Apache Maven': {
        language: 'xml',
        code: xmlbuilder
          .create({
            dependency: { groupId, artifactId, version: version },
          })
          .end({ pretty: true })
          .replace(/<\?\s*xml(\s[^>]+)?>\s*/m, ''),
      },
      'Apache Buildr': `'${groupId}:${artifactId}:jar:${version}'`,
      'Apache Ivy': {
        language: 'xml',
        code: xmlbuilder
          .create({
            dependency: {
              '@groupId': groupId,
              '@name': artifactId,
              '@rev': version,
            },
          })
          .end({ pretty: true })
          .replace(/<\?\s*xml(\s[^>]+)?>\s*/m, ''),
      },
      'Groovy Grape': `@Grapes(\n@Grab(group='${groupId}', module='${artifactId}', version='${version}')\n)`,
      'Gradle / Grails': `compile '${groupId}:${artifactId}:${version}'`,
    },
  };
  return result;
}

/**
 * Looks up the `jsii-java-runtime` package from the local repository.
 * If it contains a "maven-repo" directory, it will be added as a local maven repo
 * so when we build locally, we build against it and not against the one published
 * to Maven Central.
 */
export function findJavaRuntimeLocalRepository() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports,import/no-extraneous-dependencies
    const javaRuntime = require('@jsii/java-runtime');
    logging.info(
      `Using local version of the Java jsii runtime package at: ${javaRuntime.repository}`,
    );
    return javaRuntime.repository;
  } catch {
    return undefined;
  }
}
