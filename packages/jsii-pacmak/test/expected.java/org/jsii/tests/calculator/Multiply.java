package org.jsii.tests.calculator;
/**
 * The "*" binary operation.
 */
@org.jsii.Jsii(module = org.jsii.tests.calculator.$Module.class, fqn = "jsii$jsii_calc$.Multiply")
public class Multiply extends org.jsii.tests.calculator.BinaryOperation implements org.jsii.tests.calculator.IFriendlier,org.jsii.tests.calculator.IRandomNumberGenerator {
    protected Multiply(final org.jsii.JsiiObject.InitializationMode mode) {
        super(mode);
    }
    /**
     * @param rhs Right-hand side operand
     * Creates a BinaryOperation
     * @param lhs Left-hand side operand
     * @param rhs Right-hand side operand
     */
    public Multiply(final org.jsii.tests.calculator.lib.Value lhs, final org.jsii.tests.calculator.lib.Value rhs) {
        super(org.jsii.JsiiObject.InitializationMode.Jsii);
        org.jsii.JsiiEngine.getInstance().createNewObject(this, lhs, rhs);
    }
    /**
     * String representation of the value.
     */
    public java.lang.String toString() {
        return this.jsiiCall("toString", java.lang.String.class);
    }
    /**
     * Say goodbye.
     */
    public java.lang.String goodbye() {
        return this.jsiiCall("goodbye", java.lang.String.class);
    }
    /**
     * Say farewell.
     */
    public java.lang.String farewell() {
        return this.jsiiCall("farewell", java.lang.String.class);
    }
    /**
     * Returns another random number.
     */
    public java.lang.Number next() {
        return this.jsiiCall("next", java.lang.Number.class);
    }
    /**
     * The value.
     */
    public java.lang.Number getValue() {
        return this.jsiiGet("value", java.lang.Number.class);
    }
}
