package software.amazon.jsii.tests.calculator;

/**
 *  (experimental)
 * <p>
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.JSII417PublicBaseOfBase")
public class JSII417PublicBaseOfBase extends software.amazon.jsii.JsiiObject {

    protected JSII417PublicBaseOfBase(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected JSII417PublicBaseOfBase(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public JSII417PublicBaseOfBase() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public static @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.JSII417PublicBaseOfBase makeInstance() {
        return software.amazon.jsii.JsiiObject.jsiiStaticCall(software.amazon.jsii.tests.calculator.JSII417PublicBaseOfBase.class, "makeInstance", software.amazon.jsii.tests.calculator.JSII417PublicBaseOfBase.class);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void foo() {
        this.jsiiCall("foo", software.amazon.jsii.NativeType.VOID);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public @org.jetbrains.annotations.NotNull java.lang.Boolean getHasRoot() {
        return this.jsiiGet("hasRoot", java.lang.Boolean.class);
    }
}
