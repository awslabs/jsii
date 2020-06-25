#!/bin/bash
set -euo pipefail

commit=${CODEBUILD_RESOLVED_SOURCE_VERSION:-}
# CODEBUILD_RESOLVED_SOURCE_VERSION is not defined (i.e. local build or CodePipeline build),
# use the HEAD commit hash
if [ -z "${commit}" ]; then
  commit="$(git rev-parse --verify HEAD)"
fi

cat > lib/version.ts <<HERE
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Generated at $(date -u +"%Y-%m-%dT%H:%M:%SZ") by generate.sh

/** The qualified version number for this JSII compiler. */
export const VERSION = \`\${require('../package.json').version.replace(/\\+[0-9a-f]+\$/, '')} (build ${commit:0:7})\`;
HERE
