using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    [JsiiTypeProxy(nativeType: typeof(IBell), fullyQualifiedName: "jsii-calc.IBell")]
    internal sealed class IBellProxy : DeputyBase, Amazon.JSII.Tests.CalculatorNamespace.IBell
    {
        private IBellProxy(ByRefValue reference): base(reference)
        {
        }

        [JsiiMethod(name: "ring")]
        public void Ring()
        {
            InvokeInstanceVoidMethod(new System.Type[]{}, new object[]{});
        }
    }
}
