using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Ensures abstract members implementations correctly register overrides in various languages.</summary>
    /// <remarks>
    /// stability: Experimental
    /// </remarks>
    [JsiiTypeProxy(nativeType: typeof(Amazon.JSII.Tests.CalculatorNamespace.AbstractSuite), fullyQualifiedName: "jsii-calc.AbstractSuite")]
    internal sealed class AbstractSuiteProxy : Amazon.JSII.Tests.CalculatorNamespace.AbstractSuite
    {
        private AbstractSuiteProxy(ByRefValue reference): base(reference)
        {
        }

        /// <summary></summary>
        /// <remarks>
        /// stability: Experimental
        /// </remarks>
        [JsiiProperty(name: "property", typeJson: "{\"primitive\":\"string\"}")]
        protected override string Property
        {
            get => GetInstanceProperty<string>();
            set => SetInstanceProperty(value);
        }

        /// <summary></summary>
        /// <param name="str"></param>
        /// <remarks>
        /// stability: Experimental
        /// </remarks>
        [JsiiMethod(name: "someMethod", returnsJson: "{\"type\":{\"primitive\":\"string\"}}", parametersJson: "[{\"name\":\"str\",\"type\":{\"primitive\":\"string\"}}]")]
        protected override string SomeMethod(string str)
        {
            return InvokeInstanceMethod<string>(new System.Type[]{typeof(string)}, new object[]{str});
        }
    }
}
