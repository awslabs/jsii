using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    #pragma warning disable CS8618

    /// <summary> (experimental)</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiByValue(fqn: "jsii-calc.DiamondInheritanceBaseLevelStruct")]
    public class DiamondInheritanceBaseLevelStruct : Amazon.JSII.Tests.CalculatorNamespace.IDiamondInheritanceBaseLevelStruct
    {
        /// <summary> (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "baseLevelProperty", typeJson: "{\"primitive\":\"string\"}", isOverride: true)]
        public string BaseLevelProperty
        {
            get;
            set;
        }
    }
}
