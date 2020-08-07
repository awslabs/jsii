using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace.LibNamespace
{
    /// <summary>This is the first struct we have created in jsii. (deprecated)</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Deprecated
    /// </remarks>
    [JsiiTypeProxy(nativeType: typeof(IMyFirstStruct), fullyQualifiedName: "@scope/jsii-calc-lib.MyFirstStruct")]
    [System.Obsolete()]
    internal sealed class MyFirstStructProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.LibNamespace.IMyFirstStruct
    {
        private MyFirstStructProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary>An awesome number value. (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiProperty(name: "anumber", typeJson: "{\"primitive\":\"number\"}")]
        [System.Obsolete()]
        public double Anumber
        {
            get => GetInstanceProperty<double>();
        }

        /// <summary>A string value. (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiProperty(name: "astring", typeJson: "{\"primitive\":\"string\"}")]
        [System.Obsolete()]
        public string Astring
        {
            get => GetInstanceProperty<string>();
        }

        /// <summary> (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "firstOptional", typeJson: "{\"collection\":{\"elementtype\":{\"primitive\":\"string\"},\"kind\":\"array\"}}", isOptional: true)]
        [System.Obsolete()]
        public string[]? FirstOptional
        {
            get => GetInstanceProperty<string[]?>();
        }
    }
}
