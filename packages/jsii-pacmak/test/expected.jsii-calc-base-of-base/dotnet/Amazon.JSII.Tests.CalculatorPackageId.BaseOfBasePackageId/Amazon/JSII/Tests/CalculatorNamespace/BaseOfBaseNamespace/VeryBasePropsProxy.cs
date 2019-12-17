using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace.BaseOfBaseNamespace
{
    /// <summary></summary>
    [JsiiTypeProxy(nativeType: typeof(IVeryBaseProps), fullyQualifiedName: "@scope/jsii-calc-base-of-base.VeryBaseProps")]
    internal sealed class VeryBasePropsProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.BaseOfBaseNamespace.IVeryBaseProps
    {
        private VeryBasePropsProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary></summary>
        [JsiiProperty(name: "foo", typeJson: "{\"fqn\":\"@scope/jsii-calc-base-of-base.Very\"}")]
        public Amazon.JSII.Tests.CalculatorNamespace.BaseOfBaseNamespace.Very Foo
        {
            get => GetInstanceProperty<Amazon.JSII.Tests.CalculatorNamespace.BaseOfBaseNamespace.Very>();
        }
    }
}
