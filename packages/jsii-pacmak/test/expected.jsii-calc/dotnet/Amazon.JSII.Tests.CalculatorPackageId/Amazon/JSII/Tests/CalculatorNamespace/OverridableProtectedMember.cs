using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <remarks>
    /// <strong>See</strong>: https://github.com/aws/jsii/issues/903
    /// </remarks>
    [JsiiClass(nativeType: typeof(Amazon.JSII.Tests.CalculatorNamespace.OverridableProtectedMember), fullyQualifiedName: "jsii-calc.OverridableProtectedMember")]
    public class OverridableProtectedMember : DeputyBase
    {
        public OverridableProtectedMember(): base(new DeputyProps(new object[]{}))
        {
        }

        /// <summary>Used by jsii to construct an instance of this class from a Javascript-owned object reference</summary>
        /// <param name="reference">The Javascript-owned object reference</param>
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
        protected OverridableProtectedMember(ByRefValue reference): base(reference)
        {
        }

        /// <summary>Used by jsii to construct an instance of this class from DeputyProps</summary>
        /// <param name="props">The deputy props</param>
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
        protected OverridableProtectedMember(DeputyProps props): base(props)
        {
        }

        [JsiiMethod(name: "overrideMe", returnsJson: "{\"type\":{\"primitive\":\"string\"}}")]
        protected virtual string OverrideMe()
        {
            return InvokeInstanceMethod<string>(new System.Type[]{}, new object[]{});
        }

        [JsiiMethod(name: "switchModes")]
        public virtual void SwitchModes()
        {
            InvokeInstanceVoidMethod(new System.Type[]{}, new object[]{});
        }

        [JsiiMethod(name: "valueFromProtected", returnsJson: "{\"type\":{\"primitive\":\"string\"}}")]
        public virtual string ValueFromProtected()
        {
            return InvokeInstanceMethod<string>(new System.Type[]{}, new object[]{});
        }

        [JsiiProperty(name: "overrideReadOnly", typeJson: "{\"primitive\":\"string\"}")]
        protected virtual string OverrideReadOnly
        {
            get => GetInstanceProperty<string>();
        }

        [JsiiProperty(name: "overrideReadWrite", typeJson: "{\"primitive\":\"string\"}")]
        protected virtual string OverrideReadWrite
        {
            get => GetInstanceProperty<string>();
            set => SetInstanceProperty(value);
        }
    }
}
