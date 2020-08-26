using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Generates random numbers.</summary>
    [JsiiInterface(nativeType: typeof(IRandomNumberGenerator), fullyQualifiedName: "jsii-calc.IRandomNumberGenerator")]
    public interface IRandomNumberGenerator
    {
        /// <summary>Returns another random number.</summary>
        /// <returns>A random number.</returns>
        [JsiiMethod(name: "next", returnsJson: "{\"type\":{\"primitive\":\"number\"}}")]
        double Next();
    }
}
