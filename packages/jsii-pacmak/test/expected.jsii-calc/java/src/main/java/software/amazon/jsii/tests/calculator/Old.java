package software.amazon.jsii.tests.calculator;

/**
 * Old class.
 * 
 * @deprecated Use the new class
 */
@javax.annotation.Generated(value = "jsii-pacmak")
@software.amazon.jsii.Jsii(module = software.amazon.jsii.tests.calculator.$Module.class, fqn = "jsii-calc.Old")
public class Old extends software.amazon.jsii.JsiiObject {
    protected Old(final software.amazon.jsii.JsiiObject.InitializationMode mode) {
        super(mode);
    }
    public Old() {
        super(software.amazon.jsii.JsiiObject.InitializationMode.Jsii);
        software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this);
    }

    /**
     * Doo wop that thing.
     */
    public void doAThing() {
        this.jsiiCall("doAThing", Void.class);
    }
}
