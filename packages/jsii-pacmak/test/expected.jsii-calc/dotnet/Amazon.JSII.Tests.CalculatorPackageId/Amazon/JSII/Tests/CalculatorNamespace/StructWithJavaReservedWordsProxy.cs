using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary></summary>
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiTypeProxy(nativeType: typeof(IStructWithJavaReservedWords), fullyQualifiedName: "jsii-calc.StructWithJavaReservedWords")]
    internal sealed class StructWithJavaReservedWordsProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.IStructWithJavaReservedWords
    {
        private StructWithJavaReservedWordsProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary></summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "default", typeJson: "{\"primitive\":\"string\"}")]
        public string Default
        {
            get => GetInstanceProperty<string>();
        }

        /// <summary></summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "assert", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        public string Assert
        {
            get => GetInstanceProperty<string>();
        }

        /// <summary></summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "result", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        public string Result
        {
            get => GetInstanceProperty<string>();
        }

        /// <summary></summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "that", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        public string That
        {
            get => GetInstanceProperty<string>();
        }
    }
}
