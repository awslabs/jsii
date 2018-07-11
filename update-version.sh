#!/bin/bash

################################################################################################
# skip for now until we figure out a better way to bump without breaking all test expectations #
################################################################################################

exit 0 



set -euo pipefail
# HACK: lerna needs a git repo to work but publish will work nevertheless
git init

version="$(node -e "console.log(require('./lerna.json').version)")"
commit="${CODEBUILD_RESOLVED_SOURCE_VERSION:-}"

# CODEBUILD_RESOLVED_SOURCE_VERSION is not defined (i.e. local build or CodePipeline build),
# use the HEAD commit hash
if [ -z "${commit}" ]; then
  commit="$(git rev-parse --verify HEAD)"
fi

exec node_modules/.bin/lerna publish --skip-git --skip-npm --repo-version=${version}+${commit:0:7} --yes
