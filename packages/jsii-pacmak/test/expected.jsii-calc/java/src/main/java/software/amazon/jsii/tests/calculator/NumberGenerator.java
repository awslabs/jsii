package software.amazon.jsii.tests.calculator;

/**
 * This allows us to test that a reference can be stored for objects that implement interfaces.
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.NumberGenerator")
public class NumberGenerator extends software.amazon.jsii.JsiiObject {

    protected NumberGenerator(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected NumberGenerator(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     * @param generator This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public NumberGenerator(final @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.IRandomNumberGenerator generator) {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this, new Object[] { java.util.Objects.requireNonNull(generator, "generator is required") });
    }

    /**
     * @param gen This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public @org.jetbrains.annotations.NotNull java.lang.Boolean isSameGenerator(final @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.IRandomNumberGenerator gen) {
        return this.jsiiCall("isSameGenerator", java.lang.Boolean.class, new Object[] { java.util.Objects.requireNonNull(gen, "gen is required") });
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public @org.jetbrains.annotations.NotNull java.lang.Number nextTimes100() {
        return this.jsiiCall("nextTimes100", java.lang.Number.class);
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.IRandomNumberGenerator getGenerator() {
        return this.jsiiGet("generator", software.amazon.jsii.tests.calculator.IRandomNumberGenerator.class);
    }

    /**
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Stable)
    public void setGenerator(final @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.IRandomNumberGenerator value) {
        this.jsiiSet("generator", java.util.Objects.requireNonNull(value, "generator is required"));
    }
}
