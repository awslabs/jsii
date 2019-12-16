using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary></summary>
    /// <remarks>
    /// stability: Experimental
    /// </remarks>
    [JsiiInterface(nativeType: typeof(IAnotherPublicInterface), fullyQualifiedName: "jsii-calc.IAnotherPublicInterface")]
    public interface IAnotherPublicInterface
    {
        /// <summary></summary>
        /// <remarks>
        /// stability: Experimental
        /// </remarks>
        [JsiiProperty(name: "a", typeJson: "{\"primitive\":\"string\"}")]
        string A
        {
            get;
            set;
        }
    }
}
