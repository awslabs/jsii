using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiInterface(nativeType: typeof(IImplictBaseOfBase), fullyQualifiedName: "jsii-calc.ImplictBaseOfBase")]
    public interface IImplictBaseOfBase : Amazon.JSII.Tests.CalculatorNamespace.BaseNamespace.IBaseProps
    {
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "goo", typeJson: "{\"primitive\":\"date\"}")]
        System.DateTime Goo
        {
            get;
        }
    }
}
