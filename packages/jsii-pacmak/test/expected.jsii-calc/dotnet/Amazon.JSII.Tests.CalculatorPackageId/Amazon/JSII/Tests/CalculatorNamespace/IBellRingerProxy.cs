using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Takes the object parameter as an interface.</summary>
    [JsiiTypeProxy(nativeType: typeof(IBellRinger), fullyQualifiedName: "jsii-calc.IBellRinger")]
    internal sealed class IBellRingerProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.IBellRinger
    {
        private IBellRingerProxy(ByRefValue reference): base(reference)
        {
        }

        [JsiiMethod(name: "yourTurn", parametersJson: "[{\"name\":\"bell\",\"type\":{\"fqn\":\"jsii-calc.IBell\"}}]")]
        public void YourTurn(Amazon.JSII.Tests.CalculatorNamespace.IBell bell)
        {
            InvokeInstanceVoidMethod(new System.Type[]{typeof(Amazon.JSII.Tests.CalculatorNamespace.IBell)}, new object[]{bell});
        }
    }
}
