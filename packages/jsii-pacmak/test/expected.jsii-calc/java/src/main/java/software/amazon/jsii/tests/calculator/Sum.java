package software.amazon.jsii.tests.calculator;

/**
 * An operation that sums multiple values.
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.Sum")
public class Sum extends software.amazon.jsii.tests.calculator.composition.CompositeOperation {

    protected Sum(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected Sum(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public Sum() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     * The expression that this operation consists of.
     * <p>
     * Must be implemented by derived classes.
     */
    @Override
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.lib.Value getExpression() {
        return this.jsiiGet("expression", software.amazon.jsii.tests.calculator.lib.Value.class);
    }

    /**
     * The parts to sum.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public @org.jetbrains.annotations.NotNull java.util.List<software.amazon.jsii.tests.calculator.lib.Value> getParts() {
        return java.util.Collections.unmodifiableList(this.jsiiGet("parts", software.amazon.jsii.NativeType.listOf(software.amazon.jsii.NativeType.forClass(software.amazon.jsii.tests.calculator.lib.Value.class))));
    }

    /**
     * The parts to sum.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void setParts(final @org.jetbrains.annotations.NotNull java.util.List<software.amazon.jsii.tests.calculator.lib.Value> value) {
        this.jsiiSet("parts", java.util.Objects.requireNonNull(value, "parts is required"));
    }
}
