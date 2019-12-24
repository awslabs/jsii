using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Make sure that setters are properly called on objects with interfaces.</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiTypeProxy(nativeType: typeof(IObjectWithProperty), fullyQualifiedName: "jsii-calc.IObjectWithProperty")]
    internal sealed class IObjectWithPropertyProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.IObjectWithProperty
    {
        private IObjectWithPropertyProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary></summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "property", typeJson: "{\"primitive\":\"string\"}")]
        public string Property
        {
            get => GetInstanceProperty<string>();
            set => SetInstanceProperty(value);
        }

        /// <summary></summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiMethod(name: "wasSet", returnsJson: "{\"type\":{\"primitive\":\"boolean\"}}")]
        public bool WasSet()
        {
            return InvokeInstanceMethod<bool>(new System.Type[]{}, new object[]{});
        }
    }
}
