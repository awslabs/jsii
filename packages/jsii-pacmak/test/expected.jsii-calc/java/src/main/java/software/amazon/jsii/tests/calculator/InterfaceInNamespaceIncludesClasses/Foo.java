package software.amazon.jsii.tests.calculator.InterfaceInNamespaceIncludesClasses;

/**
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.InterfaceInNamespaceIncludesClasses.Foo")
public class Foo extends software.amazon.jsii.JsiiObject {
    protected Foo(final software.amazon.jsii.JsiiObject.InitializationMode mode) {
        super(mode);
    }
    public Foo() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.Jsii);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    @javax.annotation.Nullable
    public java.lang.String getBar() {
        return this.jsiiGet("bar", java.lang.String.class);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void setBar(@javax.annotation.Nullable final java.lang.String value) {
        this.jsiiSet("bar", value);
    }
}
