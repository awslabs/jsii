package software.amazon.jsii.tests.calculator;

/**
 *  (experimental)
 * <p>
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.AnonymousImplementationProvider")
public class AnonymousImplementationProvider extends software.amazon.jsii.JsiiObject implements software.amazon.jsii.tests.calculator.IAnonymousImplementationProvider {

    protected AnonymousImplementationProvider(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected AnonymousImplementationProvider(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public AnonymousImplementationProvider() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    @Override
    public @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.Implementation provideAsClass() {
        return this.jsiiCall("provideAsClass", software.amazon.jsii.tests.calculator.Implementation.class);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    @Override
    public @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.IAnonymouslyImplementMe provideAsInterface() {
        return this.jsiiCall("provideAsInterface", software.amazon.jsii.tests.calculator.IAnonymouslyImplementMe.class);
    }
}
