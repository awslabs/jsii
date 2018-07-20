package org.jsii.tests.calculator;
public interface IInterfaceWithProperties extends org.jsii.JsiiSerializable {
    java.lang.String getReadOnlyString();
    java.lang.String getReadWriteString();
    void setReadWriteString(final java.lang.String value);

    // ==================================================================
    // Builder
    // ==================================================================

    static Builder builder() {
        return new Builder();
    }
    /**
     * A fluent step builder class for IInterfaceWithProperties.
     * The build() method will be available once all required properties are fulfilled.
     */
    class Builder {
        public ReadWriteStringStep withReadOnlyString(final java.lang.String value) {
            return new FullBuilder().withReadOnlyString(value);
        }

        public interface ReadWriteStringStep {
            /**
             * Sets the value for IInterfaceWithProperties::ReadWriteString.
             */
            Build withReadWriteString(final java.lang.String value);
        }

        public interface Build {
            /**
             * @return a new {@link IInterfaceWithProperties} object, initialized with the values set on this builder.
             */
            IInterfaceWithProperties build();
        }

        class FullBuilder implements ReadWriteStringStep, Build {

            private Jsii$Pojo instance = new Jsii$Pojo();

            public ReadWriteStringStep withReadOnlyString(final java.lang.String value) {
                java.util.Objects.requireNonNull(value, "IInterfaceWithProperties#readOnlyString is required");
                this.instance._readOnlyString = value;
                return this;
            }
            public Build withReadWriteString(final java.lang.String value) {
                java.util.Objects.requireNonNull(value, "IInterfaceWithProperties#readWriteString is required");
                this.instance._readWriteString = value;
                return this;
            }
            public IInterfaceWithProperties build() {
                IInterfaceWithProperties result = this.instance;
                this.instance = new Jsii$Pojo();
                return result;
            }
        }
    }

    /**
     * A PoJo (plain-old-java-object) class that implements this interface.
     */
    class Jsii$Pojo implements IInterfaceWithProperties {

        /**
         * Constructor used by builders.
         */
        protected Jsii$Pojo() { }


        protected java.lang.String _readOnlyString;

        public java.lang.String getReadOnlyString() {
            return this._readOnlyString;
        }

        protected java.lang.String _readWriteString;

        public java.lang.String getReadWriteString() {
            return this._readWriteString;
        }
        public void setReadWriteString(final java.lang.String value) {
            this._readWriteString = value;
        }
    }

    /**
     * A proxy class which for javascript object literal which adhere to this interface.
     */
    class Jsii$Proxy extends org.jsii.JsiiObject implements org.jsii.tests.calculator.IInterfaceWithProperties {
        protected Jsii$Proxy(final org.jsii.JsiiObject.InitializationMode mode) {
            super(mode);
        }
        public java.lang.String getReadOnlyString() {
            return this.jsiiGet("readOnlyString", java.lang.String.class);
        }
        public java.lang.String getReadWriteString() {
            return this.jsiiGet("readWriteString", java.lang.String.class);
        }
        public void setReadWriteString(final java.lang.String value) {
            this.jsiiSet("readWriteString", java.util.Objects.requireNonNull(value, "readWriteString is required"));
        }
    }
}
