using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>jsii#282, aws-cdk#157: null should be treated as "undefined".</summary>
    [JsiiClass(nativeType: typeof(Amazon.JSII.Tests.CalculatorNamespace.NullShouldBeTreatedAsUndefined), fullyQualifiedName: "jsii-calc.NullShouldBeTreatedAsUndefined", parametersJson: "[{\"name\":\"_param1\",\"type\":{\"primitive\":\"string\"}},{\"name\":\"optional\",\"optional\":true,\"type\":{\"primitive\":\"any\"}}]")]
    public class NullShouldBeTreatedAsUndefined : DeputyBase
    {
        public NullShouldBeTreatedAsUndefined(string param1, object? optional = null): base(new DeputyProps(new object?[]{param1, optional}))
        {
        }

        /// <summary>Used by jsii to construct an instance of this class from a Javascript-owned object reference</summary>
        /// <param name="reference">The Javascript-owned object reference</param>
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
        protected NullShouldBeTreatedAsUndefined(ByRefValue reference): base(reference)
        {
        }

        /// <summary>Used by jsii to construct an instance of this class from DeputyProps</summary>
        /// <param name="props">The deputy props</param>
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
        protected NullShouldBeTreatedAsUndefined(DeputyProps props): base(props)
        {
        }

        [JsiiMethod(name: "giveMeUndefined", parametersJson: "[{\"name\":\"value\",\"optional\":true,\"type\":{\"primitive\":\"any\"}}]")]
        public virtual void GiveMeUndefined(object? @value = null)
        {
            InvokeInstanceVoidMethod(new System.Type[]{typeof(object)}, new object?[]{@value});
        }

        [JsiiMethod(name: "giveMeUndefinedInsideAnObject", parametersJson: "[{\"name\":\"input\",\"type\":{\"fqn\":\"jsii-calc.NullShouldBeTreatedAsUndefinedData\"}}]")]
        public virtual void GiveMeUndefinedInsideAnObject(Amazon.JSII.Tests.CalculatorNamespace.INullShouldBeTreatedAsUndefinedData input)
        {
            InvokeInstanceVoidMethod(new System.Type[]{typeof(Amazon.JSII.Tests.CalculatorNamespace.INullShouldBeTreatedAsUndefinedData)}, new object[]{input});
        }

        [JsiiMethod(name: "verifyPropertyIsUndefined")]
        public virtual void VerifyPropertyIsUndefined()
        {
            InvokeInstanceVoidMethod(new System.Type[]{}, new object[]{});
        }

        [JsiiOptional]
        [JsiiProperty(name: "changeMeToUndefined", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        public virtual string? ChangeMeToUndefined
        {
            get => GetInstanceProperty<string?>();
            set => SetInstanceProperty(value);
        }
    }
}
