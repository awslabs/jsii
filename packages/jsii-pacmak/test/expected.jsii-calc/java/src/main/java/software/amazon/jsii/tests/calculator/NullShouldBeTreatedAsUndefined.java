package software.amazon.jsii.tests.calculator;

/**
 * jsii#282, aws-cdk#157: null should be treated as "undefined".
 * <p>
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.NullShouldBeTreatedAsUndefined")
public class NullShouldBeTreatedAsUndefined extends software.amazon.jsii.JsiiObject {

    protected NullShouldBeTreatedAsUndefined(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected NullShouldBeTreatedAsUndefined(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     * EXPERIMENTAL
     * <p>
     * @param _param1 This parameter is required.
     * @param optional
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public NullShouldBeTreatedAsUndefined(final java.lang.String _param1, final java.lang.Object optional) {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this, new Object[] { java.util.Objects.requireNonNull(_param1, "_param1 is required"), optional });
    }

    /**
     * EXPERIMENTAL
     * <p>
     * @param _param1 This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public NullShouldBeTreatedAsUndefined(final java.lang.String _param1) {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this, new Object[] { java.util.Objects.requireNonNull(_param1, "_param1 is required") });
    }

    /**
     * EXPERIMENTAL
     * <p>
     * @param value
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void giveMeUndefined(final java.lang.Object value) {
        this.jsiiCall("giveMeUndefined", software.amazon.jsii.NativeType.VOID, new Object[] { value });
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void giveMeUndefined() {
        this.jsiiCall("giveMeUndefined", software.amazon.jsii.NativeType.VOID);
    }

    /**
     * EXPERIMENTAL
     * <p>
     * @param input This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void giveMeUndefinedInsideAnObject(final software.amazon.jsii.tests.calculator.NullShouldBeTreatedAsUndefinedData input) {
        this.jsiiCall("giveMeUndefinedInsideAnObject", software.amazon.jsii.NativeType.VOID, new Object[] { java.util.Objects.requireNonNull(input, "input is required") });
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void verifyPropertyIsUndefined() {
        this.jsiiCall("verifyPropertyIsUndefined", software.amazon.jsii.NativeType.VOID);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public java.lang.String getChangeMeToUndefined() {
        return this.jsiiGet("changeMeToUndefined", java.lang.String.class);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void setChangeMeToUndefined(final java.lang.String value) {
        this.jsiiSet("changeMeToUndefined", value);
    }
}
