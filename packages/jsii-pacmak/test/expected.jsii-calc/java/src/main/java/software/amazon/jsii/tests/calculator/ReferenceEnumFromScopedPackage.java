package software.amazon.jsii.tests.calculator;

/**
 * See awslabs/jsii#138. (experimental)
 * <p>
 * EXPERIMENTAL
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.ReferenceEnumFromScopedPackage")
public class ReferenceEnumFromScopedPackage extends software.amazon.jsii.JsiiObject {

    protected ReferenceEnumFromScopedPackage(final software.amazon.jsii.JsiiObjectRef objRef) {
        super(objRef);
    }

    protected ReferenceEnumFromScopedPackage(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode) {
        super(initializationMode);
    }

    /**
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public ReferenceEnumFromScopedPackage() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public @org.jetbrains.annotations.Nullable software.amazon.jsii.tests.calculator.lib.EnumFromScopedModule loadFoo() {
        return this.jsiiCall("loadFoo", software.amazon.jsii.tests.calculator.lib.EnumFromScopedModule.class);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     * <p>
     * @param value This parameter is required.
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void saveFoo(final @org.jetbrains.annotations.NotNull software.amazon.jsii.tests.calculator.lib.EnumFromScopedModule value) {
        this.jsiiCall("saveFoo", software.amazon.jsii.NativeType.VOID, new Object[] { java.util.Objects.requireNonNull(value, "value is required") });
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public @org.jetbrains.annotations.Nullable software.amazon.jsii.tests.calculator.lib.EnumFromScopedModule getFoo() {
        return this.jsiiGet("foo", software.amazon.jsii.tests.calculator.lib.EnumFromScopedModule.class);
    }

    /**
     *  (experimental)
     * <p>
     * EXPERIMENTAL
     */
    @software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.Experimental)
    public void setFoo(final @org.jetbrains.annotations.Nullable software.amazon.jsii.tests.calculator.lib.EnumFromScopedModule value) {
        this.jsiiSet("foo", value);
    }
}
