const packageInfo = require('./package.json');
const { groupId, artifactId, version } = require('./lib').maven;

process.stdout.write(`<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Generated by ${__filename} at ${new Date().toISOString()} -->

    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>${version}</version>
    <packaging>jar</packaging>

    <name>${packageInfo.name}</name>
    <description>${packageInfo.description}</description>
    <url>${packageInfo.homepage}</url>

    <licenses>
        <license>
            <name>${packageInfo.license}</name>
            <url>https://spdx.org/licenses/${packageInfo.license}.html</url>
            <distribution>repo</distribution>
        </license>
    </licenses>

    <organization>
        <name>Amazon Web Services</name>
        <url>https://aws.amazon.com</url>
    </organization>

    <developers>
        <developer>
            <id>amazonwebservices</id>
            <name>${packageInfo.author.name}</name>
            <email>${packageInfo.author.email}</email>
            <url>${packageInfo.author.url}</url>
            <organization>Amazon Web Services</organization>
            <organizationUrl>https://aws.amazon.com</organizationUrl>
            <roles>
                <role>developer</role>
            </roles>
        </developer>
    </developers>

    <scm>
        <connection>scm:${packageInfo.repository.type}:${packageInfo.repository.url}</connection>
        <developerConnection>scm:${packageInfo.repository.type}:${packageInfo.repository.url}</developerConnection>
        <url>${packageInfo.repository.url}</url>
        <tag>v${packageInfo.version}</tag>
    </scm>

    <issueManagement>
        <url>${packageInfo.bugs.url}</url>
    </issueManagement>

    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <!-- Versions of the dependencies -->
        <hamcrest.version>[1.3,1.4)</hamcrest.version>
        <jackson-core.version>[2.10.1,2.11.0)</jackson-core.version>
        <jackson-databind.version>[2.10.1,2.11.0)</jackson-databind.version>
        <jetbrains-annotations.version>[16.0.3,20.0.0)</jetbrains-annotations.version>
        <junit.version>[5.6.0,5.7.0)</junit.version>
        <mockito.version>[3.2.4,3.3.0)</mockito.version>
    </properties>

    <dependencies>
        <!-- https://mvnrepository.com/artifact/com.fasterxml.jackson.core/jackson-core -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-core</artifactId>
            <version>\${jackson-core.version}</version>
        </dependency>

        <!-- https://mvnrepository.com/artifact/com.fasterxml.jackson.core/jackson-databind -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>\${jackson-databind.version}</version>
        </dependency>

        <!-- https://mvnrepository.com/artifact/org.jetbrains/annotations -->
        <dependency>
            <groupId>org.jetbrains</groupId>
            <artifactId>annotations</artifactId>
            <version>\${jetbrains-annotations.version}</version>
        </dependency>

        <!-- https://mvnrepository.com/artifact/org.junit.jupiter/junit-jupiter-api -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter-api</artifactId>
            <version>\${junit.version}</version>
            <scope>test</scope>
        </dependency>

        <!-- https://mvnrepository.com/artifact/org.junit.jupiter/junit-jupiter-engine -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter-engine</artifactId>
            <version>\${junit.version}</version>
            <scope>test</scope>
        </dependency>

        <!-- https://mvnrepository.com/artifact/org.hamcrest/hamcrest-all -->
        <dependency>
            <groupId>org.hamcrest</groupId>
            <artifactId>hamcrest-all</artifactId>
            <version>\${hamcrest.version}</version>
            <scope>test</scope>
        </dependency>

        <!-- https://mvnrepository.com/artifact/org.mockito/mockito-junit-jupiter -->
        <dependency>
            <groupId>org.mockito</groupId>
            <artifactId>mockito-junit-jupiter</artifactId>
            <version>\${mockito.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>1.8</source>
                    <target>1.8</target>
                </configuration>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-source-plugin</artifactId>
                <version>3.2.1</version>
                <executions>
                    <execution>
                        <id>attach-sources</id>
                        <goals>
                            <goal>jar</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-javadoc-plugin</artifactId>
                <version>3.1.1</version>
                <executions>
                    <execution>
                        <id>attach-javadocs</id>
                        <goals>
                            <goal>jar</goal>
                        </goals>
                    </execution>
                </executions>
                <configuration>
                    <failOnWarnings>false</failOnWarnings>
                    <show>protected</show>
                </configuration>
            </plugin>

            <plugin>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0-M4</version>
            </plugin>

            <plugin>
                <artifactId>maven-failsafe-plugin</artifactId>
                <version>3.0.0-M4</version>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-enforcer-plugin</artifactId>
                <version>3.0.0-M3</version>
                <executions>
                    <execution>
                        <id>enforce-maven</id>
                        <goals>
                            <goal>enforce</goal>
                        </goals>
                        <configuration>
                            <rules>
                                <requireMavenVersion>
                                    <version>3.6</version>
                                </requireMavenVersion>
                            </rules>
                        </configuration>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.codehaus.mojo</groupId>
                <artifactId>versions-maven-plugin</artifactId>
                <version>2.7</version>
                <configuration>
                    <generateBackupPoms>false</generateBackupPoms>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`);
