package software.amazon.jsii.tests.calculator.submodule.nested_submodule.deeply_nested;

/**
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.submodule.nested_submodule.deeplyNested.INamespaced")
@software.amazon.jsii.Jsii.Proxy(INamespaced.Jsii$Proxy.class)
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
public interface INamespaced extends software.amazon.jsii.JsiiSerializable {

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    @org.jetbrains.annotations.NotNull java.lang.String getDefinedAt();

    /**
     * A proxy class which represents a concrete javascript instance of this type.
     */
    final static class Jsii$Proxy extends software.amazon.jsii.JsiiObject implements software.amazon.jsii.tests.calculator.submodule.nested_submodule.deeply_nested.INamespaced {
        protected Jsii$Proxy(final software.amazon.jsii.JsiiObjectRef objRef) {
            super(objRef);
        }

        /**
         */
        @Override
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
        public @org.jetbrains.annotations.NotNull java.lang.String getDefinedAt() {
            return this.jsiiGet("definedAt", java.lang.String.class);
        }
    }
}
