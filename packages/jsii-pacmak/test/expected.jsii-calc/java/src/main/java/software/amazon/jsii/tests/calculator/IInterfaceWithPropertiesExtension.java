package software.amazon.jsii.tests.calculator;

/**
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.IInterfaceWithPropertiesExtension")
@software.amazon.jsii.Jsii.Proxy(IInterfaceWithPropertiesExtension.Jsii$Proxy.class)
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
public interface IInterfaceWithPropertiesExtension extends software.amazon.jsii.JsiiSerializable, software.amazon.jsii.tests.calculator.IInterfaceWithProperties {

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    java.lang.Number getFoo();

    /**
     * EXPERIMENTAL
     */
    void setFoo(final java.lang.Number value);

    /**
     * A proxy class which represents a concrete javascript instance of this type.
     */
    final static class Jsii$Proxy extends software.amazon.jsii.JsiiObject implements software.amazon.jsii.tests.calculator.IInterfaceWithPropertiesExtension {
        protected Jsii$Proxy(final software.amazon.jsii.JsiiObjectRef objRef) {
            super(objRef);
        }

        /**
         * EXPERIMENTAL
         */
        @Override
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public java.lang.Number getFoo() {
            return this.jsiiGet("foo", software.amazon.jsii.NativeType.forClass(java.lang.Number.class));
        }

        /**
         * EXPERIMENTAL
         */
        @Override
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public void setFoo(final java.lang.Number value) {
            this.jsiiSet("foo", java.util.Objects.requireNonNull(value, "foo is required"));
        }

        /**
         * EXPERIMENTAL
         */
        @Override
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public java.lang.String getReadOnlyString() {
            return this.jsiiGet("readOnlyString", software.amazon.jsii.NativeType.forClass(java.lang.String.class));
        }

        /**
         * EXPERIMENTAL
         */
        @Override
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public java.lang.String getReadWriteString() {
            return this.jsiiGet("readWriteString", software.amazon.jsii.NativeType.forClass(java.lang.String.class));
        }

        /**
         * EXPERIMENTAL
         */
        @Override
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public void setReadWriteString(final java.lang.String value) {
            this.jsiiSet("readWriteString", java.util.Objects.requireNonNull(value, "readWriteString is required"));
        }
    }
}
