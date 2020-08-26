using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Verifies that a "pure" implementation of an interface works correctly.</summary>
    [JsiiInterface(nativeType: typeof(IStructReturningDelegate), fullyQualifiedName: "jsii-calc.IStructReturningDelegate")]
    public interface IStructReturningDelegate
    {
        [JsiiMethod(name: "returnStruct", returnsJson: "{\"type\":{\"fqn\":\"jsii-calc.StructB\"}}")]
        Amazon.JSII.Tests.CalculatorNamespace.IStructB ReturnStruct();
    }
}
