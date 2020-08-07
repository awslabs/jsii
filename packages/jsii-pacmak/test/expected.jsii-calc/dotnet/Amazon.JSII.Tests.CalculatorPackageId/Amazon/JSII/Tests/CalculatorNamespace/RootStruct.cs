using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    #pragma warning disable CS8618

    /// <summary>This is here to check that we can pass a nested struct into a kwargs by specifying it as an in-line dictionary. (experimental)</summary>
    /// <remarks>
    /// This is cheating with the (current) declared types, but this is the "more
    /// idiomatic" way for Pythonists.
    /// 
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiByValue(fqn: "jsii-calc.RootStruct")]
    public class RootStruct : Amazon.JSII.Tests.CalculatorNamespace.IRootStruct
    {
        /// <summary>May not be empty. (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "stringProp", typeJson: "{\"primitive\":\"string\"}", isOverride: true)]
        public string StringProp
        {
            get;
            set;
        }

        /// <summary> (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "nestedStruct", typeJson: "{\"fqn\":\"jsii-calc.NestedStruct\"}", isOptional: true, isOverride: true)]
        public Amazon.JSII.Tests.CalculatorNamespace.INestedStruct? NestedStruct
        {
            get;
            set;
        }
    }
}
