using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Properties for Calculator.</summary>
    [JsiiByValue]
    public class CalculatorProps : ICalculatorProps
    {
        [JsiiProperty("initialValue", "{\"primitive\":\"number\",\"nullable\":true}", true)]
        public double? InitialValue
        {
            get;
            set;
        }

        [JsiiProperty("maximumValue", "{\"primitive\":\"number\",\"nullable\":true}", true)]
        public double? MaximumValue
        {
            get;
            set;
        }
    }
}