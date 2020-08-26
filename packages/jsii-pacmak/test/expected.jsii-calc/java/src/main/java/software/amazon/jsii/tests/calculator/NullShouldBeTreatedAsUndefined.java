package software.amazon.jsii.tests.calculator;

/**
 * jsii#282, aws-cdk#157: null should be treated as "undefined".
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.NullShouldBeTreatedAsUndefined")
public class NullShouldBeTreatedAsUndefined extends software.amazon.jsii.JsiiObject {

    protected NullShouldBeTreatedAsUndefined(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected NullShouldBeTreatedAsUndefined(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     * @param _param1 This parameter is required.
     * @param optional
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public NullShouldBeTreatedAsUndefined(final @org.jetbrains.annotations.NotNull java.lang.String _param1, final @org.jetbrains.annotations.Nullable java.lang.Object optional) {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this, new Object[] { java.util.Objects.requireNonNull(_param1, "_param1 is required"), optional });
    }

    /**
     * @param _param1 This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public NullShouldBeTreatedAsUndefined(final @org.jetbrains.annotations.NotNull java.lang.String _param1) {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this, new Object[] { java.util.Objects.requireNonNull(_param1, "_param1 is required") });
    }

    /**
     * @param value
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void giveMeUndefined(final @org.jetbrains.annotations.Nullable java.lang.Object value) {
        this.jsiiCall("giveMeUndefined", software.amazon.jsii.NativeType.VOID, new Object[] { value });
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void giveMeUndefined() {
        this.jsiiCall("giveMeUndefined", software.amazon.jsii.NativeType.VOID);
    }

    /**
     * @param input This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void giveMeUndefinedInsideAnObject(final @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.NullShouldBeTreatedAsUndefinedData input) {
        this.jsiiCall("giveMeUndefinedInsideAnObject", software.amazon.jsii.NativeType.VOID, new Object[] { java.util.Objects.requireNonNull(input, "input is required") });
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void verifyPropertyIsUndefined() {
        this.jsiiCall("verifyPropertyIsUndefined", software.amazon.jsii.NativeType.VOID);
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public @org.jetbrains.annotations.Nullable java.lang.String getChangeMeToUndefined() {
        return this.jsiiGet("changeMeToUndefined", java.lang.String.class);
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void setChangeMeToUndefined(final @org.jetbrains.annotations.Nullable java.lang.String value) {
        this.jsiiSet("changeMeToUndefined", value);
    }
}
