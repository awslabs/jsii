using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary> (experimental)</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiTypeProxy(nativeType: typeof(IExtendsPrivateInterface), fullyQualifiedName: "jsii-calc.IExtendsPrivateInterface")]
    internal sealed class IExtendsPrivateInterfaceProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.IExtendsPrivateInterface
    {
        private IExtendsPrivateInterfaceProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary> (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "moreThings", typeJson: "{\"collection\":{\"elementtype\":{\"primitive\":\"string\"},\"kind\":\"array\"}}")]
        public string[] MoreThings
        {
            get => GetInstanceProperty<string[]>();
        }

        /// <summary> (experimental)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiProperty(name: "private", typeJson: "{\"primitive\":\"string\"}")]
        public string Private
        {
            get => GetInstanceProperty<string>();
            set => SetInstanceProperty(value);
        }
    }
}
