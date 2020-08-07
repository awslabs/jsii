using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace.LibNamespace
{
    /// <summary>This is a struct with only optional properties. (deprecated)</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Deprecated
    /// </remarks>
    [JsiiTypeProxy(nativeType: typeof(IStructWithOnlyOptionals), fullyQualifiedName: "@scope/jsii-calc-lib.StructWithOnlyOptionals")]
    [System.Obsolete()]
    internal sealed class StructWithOnlyOptionalsProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.LibNamespace.IStructWithOnlyOptionals
    {
        private StructWithOnlyOptionalsProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary>The first optional! (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "optional1", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        [System.Obsolete()]
        public string? Optional1
        {
            get => GetInstanceProperty<string?>();
        }

        /// <summary> (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "optional2", typeJson: "{\"primitive\":\"number\"}", isOptional: true)]
        [System.Obsolete()]
        public double? Optional2
        {
            get => GetInstanceProperty<double?>();
        }

        /// <summary> (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "optional3", typeJson: "{\"primitive\":\"boolean\"}", isOptional: true)]
        [System.Obsolete()]
        public bool? Optional3
        {
            get => GetInstanceProperty<bool?>();
        }
    }
}
