using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>This allows us to test that a reference can be stored for objects that implement interfaces.</summary>
    [JsiiClass(nativeType: typeof(Amazon.JSII.Tests.CalculatorNamespace.NumberGenerator), fullyQualifiedName: "jsii-calc.NumberGenerator", parametersJson: "[{\"name\":\"generator\",\"type\":{\"fqn\":\"jsii-calc.IRandomNumberGenerator\"}}]")]
    public class NumberGenerator : DeputyBase
    {
        public NumberGenerator(Amazon.JSII.Tests.CalculatorNamespace.IRandomNumberGenerator generator): base(new DeputyProps(new object[]{generator}))
        {
        }

        /// <summary>Used by jsii to construct an instance of this class from a Javascript-owned object reference</summary>
        /// <param name="reference">The Javascript-owned object reference</param>
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
        protected NumberGenerator(ByRefValue reference): base(reference)
        {
        }

        /// <summary>Used by jsii to construct an instance of this class from DeputyProps</summary>
        /// <param name="props">The deputy props</param>
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
        protected NumberGenerator(DeputyProps props): base(props)
        {
        }

        [JsiiMethod(name: "isSameGenerator", returnsJson: "{\"type\":{\"primitive\":\"boolean\"}}", parametersJson: "[{\"name\":\"gen\",\"type\":{\"fqn\":\"jsii-calc.IRandomNumberGenerator\"}}]")]
        public virtual bool IsSameGenerator(Amazon.JSII.Tests.CalculatorNamespace.IRandomNumberGenerator gen)
        {
            return InvokeInstanceMethod<bool>(new System.Type[]{typeof(Amazon.JSII.Tests.CalculatorNamespace.IRandomNumberGenerator)}, new object[]{gen});
        }

        [JsiiMethod(name: "nextTimes100", returnsJson: "{\"type\":{\"primitive\":\"number\"}}")]
        public virtual double NextTimes100()
        {
            return InvokeInstanceMethod<double>(new System.Type[]{}, new object[]{});
        }

        [JsiiProperty(name: "generator", typeJson: "{\"fqn\":\"jsii-calc.IRandomNumberGenerator\"}")]
        public virtual Amazon.JSII.Tests.CalculatorNamespace.IRandomNumberGenerator Generator
        {
            get => GetInstanceProperty<Amazon.JSII.Tests.CalculatorNamespace.IRandomNumberGenerator>();
            set => SetInstanceProperty(value);
        }
    }
}
