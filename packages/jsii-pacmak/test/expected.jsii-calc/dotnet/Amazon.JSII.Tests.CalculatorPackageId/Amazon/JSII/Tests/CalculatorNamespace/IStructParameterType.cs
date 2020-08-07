using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Verifies that, in languages that do keyword lifting (e.g: Python), having a struct member with the same name as a positional parameter results in the correct code being emitted. (experimental)</summary>
    /// <remarks>
    /// See: https://github.com/aws/aws-cdk/issues/4302
    /// 
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiInterface(nativeType: typeof(IStructParameterType), fullyQualifiedName: "jsii-calc.StructParameterType")]
    public interface IStructParameterType
    {
        /// <summary> (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "scope", typeJson: "{\"primitive\":\"string\"}")]
        string Scope
        {
            get;
        }

        /// <summary> (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "props", typeJson: "{\"primitive\":\"boolean\"}", isOptional: true)]
        [Amazon.JSII.Runtime.Deputy.JsiiOptional]
        bool? Props
        {
            get
            {
                return null;
            }
        }
    }
}
