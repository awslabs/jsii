FROM amazonlinux:2

# Set locale and some other interesting environment variables
ENV LANG="C.UTF-8"                                                                                                      \
    LC_ALL="C.UTF-8"                                                                                                    \
    CHARSET="UTF-8"                                                                                                     \
                                                                                                                        \
    DOTNET_CLI_TELEMETRY_OPTOUT="true"                                                                                  \
    DOTNET_RUNNING_IN_CONTAINER="true"                                                                                  \
    DOTNET_NOLOGO="true"                                                                                                \
    DOTNET_USE_POLLING_FILE_WATCHER="true"                                                                              \
    NUGET_XMLDOC_MODE="skip"                                                                                            \
                                                                                                                        \
    GEM_HOME="/usr/local/bundle"                                                                                        \
    BUNDLE_SILENCE_ROOT_WARNING="1"                                                                                     \
                                                                                                                        \
    M2_VERSION="3.6.3"                                                                                                  \
    M2_HOME="/usr/local/apache-maven"                                                                                   \
    M2="/usr/local/apache-maven/bin"                                                                                    \
    MAVEN_OPTS="-Xms256m -Xmx512m"                                                                                      \
                                                                                                                        \
    GOROOT="/usr/local/go"

# Install deltarpm as it can speed up the upgrade processes, and tar as it's needed for installing Maven
# Also upgrading anything already installed, and adding some common dependencies for included tools
RUN yum -y upgrade                                                                                                      \
  && yum -y install deltarpm tar                                                                                        \
                    make system-rpm-config                                                                              \
                    git gzip openssl rsync unzip which zip                                                              \
  && yum clean all && rm -rf /var/cache/yum

# Install .NET Core, mono & PowerShell
COPY gpg/mono.asc /tmp/mono.asc
RUN rpm --import "https://packages.microsoft.com/keys/microsoft.asc"                                                    \
  && rpm -Uvh "https://packages.microsoft.com/config/rhel/7/packages-microsoft-prod.rpm"                                \
  && rpm --import /tmp/mono.asc && rm -f /tmp/mono.asc                                                                  \
  && curl -sSL "https://download.mono-project.com/repo/centos7-stable.repo"                                             \
      | tee /etc/yum.repos.d/mono-centos7-stable.repo                                                                   \
  && yum -y install dotnet-sdk-3.1 mono-devel powershell                                                                \
  && yum clean all && rm -rf /var/cache/yum

# Install Python 3
RUN yum -y install python3 python3-pip                                                                                  \
  && python3 -m pip install --no-input --upgrade pip                                                                    \
  && python3 -m pip install --no-input --upgrade awscli black setuptools twine wheel                                    \
  && rm -rf $(pip cache dir)                                                                                            \
  && yum clean all && rm -rf /var/cache/yum

# Install JDK8 (Corretto)
RUN amazon-linux-extras enable corretto8                                                                                \
  && yum -y install java-1.8.0-amazon-corretto-devel                                                                    \
  && yum clean all && rm -rf /var/cache/yum

# Install Maven
RUN curl -sL https://www.apache.org/dist/maven/maven-3/${M2_VERSION}/binaries/apache-maven-${M2_VERSION}-bin.tar.gz     \
         -o /tmp/apache-maven.tar.gz                                                                                    \
  && curl -sL https://www.apache.org/dist/maven/maven-3/${M2_VERSION}/binaries/apache-maven-${M2_VERSION}-bin.tar.gz.asc\
          -o /tmp/apache-maven.tar.gz.asc                                                                               \
  && mkdir -p /tmp/gpg-maven && chmod go-rwx /tmp/gpg-maven                                                             \
  && curl -sL https://www.apache.org/dist/maven/KEYS | gpg --homedir /tmp/gpg-maven --import                            \
  && gpg --homedir /tmp/gpg-maven --verify /tmp/apache-maven.tar.gz.asc /tmp/apache-maven.tar.gz                        \
  && mkdir -p /usr/local && (cd /usr/local && tar xzf /tmp/apache-maven.tar.gz)                                         \
  && mv /usr/local/apache-maven-${M2_VERSION} /usr/local/apache-maven                                                   \
  && for BIN in $(find /usr/local/apache-maven/bin -type f -executable);                                                \
     do                                                                                                                 \
       ln -s $BIN /usr/local/bin/$(basename $BIN);                                                                      \
     done                                                                                                               \
  && rm -rf /tmp/apache-maven.tar.gz /tmp/apache-maven.tar.gz.asc /tmp/gpg-maven
COPY m2-settings.xml /root/.m2/settings.xml

# Install Gradle
RUN export GRADLE_VERSION="6.7"                                                                                         \
  && export GRADLE_DIST="https://services.gradle.org/distributions"                                                     \
  && curl -sSL -o gradle-bin.zip "${GRADLE_DIST}/gradle-${GRADLE_VERSION}-bin.zip"                                      \
  && curl -sSL -o gradle-bin.zip.sha256 "${GRADLE_DIST}/gradle-${GRADLE_VERSION}-bin.zip.sha256"                        \
  && echo "  ./gradle-bin.zip" >> gradle-bin.zip.sha256                                                                 \
  && sha256sum --check gradle-bin.zip.sha256                                                                            \
  && mkdir -p /opt                                                                                                      \
  && unzip -q -d /opt gradle-bin.zip                                                                                    \
  && rm -f gradle-bin.zip gradle-bin.zip.sha256                                                                         \
  && ln -s /opt/gradle-${GRADLE_VERSION} /opt/gradle
ENV PATH="/opt/gradle/bin:${PATH}"                                                                                      \
    GRADLE_HOME="/opt/gradle"

# Install Go
RUN curl -sSL https://golang.org/dl/go1.15.3.linux-amd64.tar.gz -o /tmp/go.tar.gz                                       \
  && echo "010a88df924a81ec21b293b5da8f9b11c176d27c0ee3962dc1738d2352d3c02d  /tmp/go.tar.gz" > /tmp/go.tar.gz.sha256    \
  && sha256sum --check /tmp/go.tar.gz.sha256                                                                            \
  && mkdir -p /usr/local && (cd /usr/local && tar -xzf /tmp/go.tar.gz)                                                  \
  && rm -f /tmp/go.tar.gz /tmp/go.tar.gz.sha256
ENV PATH="$GOROOT/bin:$PATH"

# Install Docker
RUN amazon-linux-extras install docker                                                                                  \
  && yum clean all && rm -rf /var/cache/yum
VOLUME /var/lib/docker

# Install Node 10+
RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash -                                                             \
  && yum -y install nodejs                                                                                              \
  && yum clean all && rm -rf /var/cache/yum                                                                             \
  && npm set unsafe-perm true

# Install Yarn
RUN curl -sSL https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo                                     \
  && yum -y install yarn                                                                                                \
  && yum clean all && rm -rf /var/cache/yum

# Install some configuration
COPY ssh_config /root/.ssh/config
RUN chmod 600 /root/.ssh/config
COPY dockerd-entrypoint.sh /usr/local/bin/

# Add the source used to build this Docker image (to facilitate re-builds, forensics)
COPY . /docker-source

## Image Metadata
ARG BUILD_TIMESTAMP
ARG COMMIT_ID
LABEL org.opencontainers.image.created=${BUILD_TIMESTAMP}                                                               \
      org.opencontainers.image.title="jsii/superchain"                                                                  \
      org.opencontainers.image.description="An image to build cross-language artifacts with AWS jsii"                   \
      org.opencontainers.image.url="https://github.com/aws/jsii/tree/main/superchain"                                 \
      org.opencontainers.image.source="https://github.com/aws/jsii.git"                                                 \
      org.opencontainers.image.revision=$COMMIT_ID                                                                      \
      org.opencontainers.image.authors="Amazon Web Services (https://aws.amazon.com)"

# Upgrade all packages that weren't up-to-date just yet (last so it risks invalidating cache less)
# This is the second time we do it (this layer may be empty)... It's in case we re-used a cached layer the first time
RUN yum -y upgrade                                                                                                      \
  && yum clean all && rm -rf /var/cache/yum

CMD ["/bin/bash"]
