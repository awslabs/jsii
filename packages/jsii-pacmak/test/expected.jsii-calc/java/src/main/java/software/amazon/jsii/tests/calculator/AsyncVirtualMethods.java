package software.amazon.jsii.tests.calculator;

/**
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.AsyncVirtualMethods")
public class AsyncVirtualMethods extends software.amazon.jsii.JsiiObject {

    protected AsyncVirtualMethods(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected AsyncVirtualMethods(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    public AsyncVirtualMethods() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.Number callMe() {
        return this.jsiiAsyncCall("callMe", software.amazon.jsii.NativeType.forClass(java.lang.Number.class));
    }

    /**
     * Just calls "overrideMeToo".
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.Number callMe2() {
        return this.jsiiAsyncCall("callMe2", software.amazon.jsii.NativeType.forClass(java.lang.Number.class));
    }

    /**
     * This method calls the "callMe" async method indirectly, which will then invoke a virtual method.
     * <p>
     * This is a "double promise" situation, which
     * means that callbacks are not going to be available immediate, but only
     * after an "immediates" cycle.
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.Number callMeDoublePromise() {
        return this.jsiiAsyncCall("callMeDoublePromise", software.amazon.jsii.NativeType.forClass(java.lang.Number.class));
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.Number dontOverrideMe() {
        return this.jsiiCall("dontOverrideMe", software.amazon.jsii.NativeType.forClass(java.lang.Number.class));
    }

    /**
     * EXPERIMENTAL
     * <p>
     * @param mult This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.Number overrideMe(final java.lang.Number mult) {
        return this.jsiiAsyncCall("overrideMe", software.amazon.jsii.NativeType.forClass(java.lang.Number.class), new Object[] { java.util.Objects.requireNonNull(mult, "mult is required") });
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.Number overrideMeToo() {
        return this.jsiiAsyncCall("overrideMeToo", software.amazon.jsii.NativeType.forClass(java.lang.Number.class));
    }
}
