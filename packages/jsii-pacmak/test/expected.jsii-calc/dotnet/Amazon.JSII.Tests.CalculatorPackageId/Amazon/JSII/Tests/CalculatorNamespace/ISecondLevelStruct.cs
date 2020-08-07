using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary> (experimental)</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiInterface(nativeType: typeof(ISecondLevelStruct), fullyQualifiedName: "jsii-calc.SecondLevelStruct")]
    public interface ISecondLevelStruct
    {
        /// <summary>It's long and required. (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "deeperRequiredProp", typeJson: "{\"primitive\":\"string\"}")]
        string DeeperRequiredProp
        {
            get;
        }

        /// <summary>It's long, but you'll almost never pass it. (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "deeperOptionalProp", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        [Amazon.JSII.Runtime.Deputy.JsiiOptional]
        string? DeeperOptionalProp
        {
            get
            {
                return null;
            }
        }
    }
}
