package software.amazon.jsii.tests.calculator;

/**
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.ImplictBaseOfBase")
@software.amazon.jsii.Jsii.Proxy(ImplictBaseOfBase.Jsii$Proxy.class)
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
public interface ImplictBaseOfBase extends software.amazon.jsii.JsiiSerializable, software.amazon.jsii.tests.calculator.base.BaseProps {

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    java.time.Instant getGoo();

    /**
     * @return a {@link Builder} of {@link ImplictBaseOfBase}
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    static Builder builder() {
        return new Builder();
    }
    /**
     * A builder for {@link ImplictBaseOfBase}
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public static final class Builder {
        private java.time.Instant goo;
        private java.lang.String bar;
        private software.amazon.jsii.tests.calculator.baseofbase.Very foo;

        /**
         * Sets the value of {@link ImplictBaseOfBase#getGoo}
         * @param goo the value to be set. This parameter is required.
         * @return {@code this}
         */
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public Builder goo(java.time.Instant goo) {
            this.goo = goo;
            return this;
        }

        /**
         * Sets the value of {@link ImplictBaseOfBase#getBar}
         * @param bar the value to be set. This parameter is required.
         * @return {@code this}
         */
        public Builder bar(java.lang.String bar) {
            this.bar = bar;
            return this;
        }

        /**
         * Sets the value of {@link ImplictBaseOfBase#getFoo}
         * @param foo the value to be set. This parameter is required.
         * @return {@code this}
         */
        public Builder foo(software.amazon.jsii.tests.calculator.baseofbase.Very foo) {
            this.foo = foo;
            return this;
        }

        /**
         * Builds the configured instance.
         * @return a new instance of {@link ImplictBaseOfBase}
         * @throws NullPointerException if any required attribute was not provided
         */
        @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
        public ImplictBaseOfBase build() {
            return new Jsii$Proxy(goo, bar, foo);
        }
    }

    /**
     * An implementation for {@link ImplictBaseOfBase}
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    final class Jsii$Proxy extends software.amazon.jsii.JsiiObject implements ImplictBaseOfBase {
        private final java.time.Instant goo;
        private final java.lang.String bar;
        private final software.amazon.jsii.tests.calculator.baseofbase.Very foo;

        /**
         * Constructor that initializes the object based on values retrieved from the JsiiObject.
         * @param objRef Reference to the JSII managed object.
         */
        protected Jsii$Proxy(final software.amazon.jsii.JsiiObjectRef objRef) {
            super(objRef);
            this.goo = this.jsiiGet("goo", software.amazon.jsii.NativeType.forClass(java.time.Instant.class));
            this.bar = this.jsiiGet("bar", software.amazon.jsii.NativeType.forClass(java.lang.String.class));
            this.foo = this.jsiiGet("foo", software.amazon.jsii.NativeType.forClass(software.amazon.jsii.tests.calculator.baseofbase.Very.class));
        }

        /**
         * Constructor that initializes the object based on literal property values passed by the {@link Builder}.
         */
        private Jsii$Proxy(final java.time.Instant goo, final java.lang.String bar, final software.amazon.jsii.tests.calculator.baseofbase.Very foo) {
            super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
            this.goo = java.util.Objects.requireNonNull(goo, "goo is required");
            this.bar = java.util.Objects.requireNonNull(bar, "bar is required");
            this.foo = java.util.Objects.requireNonNull(foo, "foo is required");
        }

        @Override
        public java.time.Instant getGoo() {
            return this.goo;
        }

        @Override
        public java.lang.String getBar() {
            return this.bar;
        }

        @Override
        public software.amazon.jsii.tests.calculator.baseofbase.Very getFoo() {
            return this.foo;
        }

        @Override
        public com.fasterxml.jackson.databind.JsonNode $jsii$toJson() {
            final com.fasterxml.jackson.databind.ObjectMapper om = software.amazon.jsii.JsiiObjectMapper.INSTANCE;
            final com.fasterxml.jackson.databind.node.ObjectNode data = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();

            data.set("goo", om.valueToTree(this.getGoo()));
            data.set("bar", om.valueToTree(this.getBar()));
            data.set("foo", om.valueToTree(this.getFoo()));

            final com.fasterxml.jackson.databind.node.ObjectNode struct = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
            struct.set("fqn", om.valueToTree("jsii-calc.ImplictBaseOfBase"));
            struct.set("data", data);

            final com.fasterxml.jackson.databind.node.ObjectNode obj = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
            obj.set("$jsii.struct", struct);

            return obj;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            ImplictBaseOfBase.Jsii$Proxy that = (ImplictBaseOfBase.Jsii$Proxy) o;

            if (!goo.equals(that.goo)) return false;
            if (!bar.equals(that.bar)) return false;
            return this.foo.equals(that.foo);
        }

        @Override
        public int hashCode() {
            int result = this.goo.hashCode();
            result = 31 * result + (this.bar.hashCode());
            result = 31 * result + (this.foo.hashCode());
            return result;
        }
    }
}
