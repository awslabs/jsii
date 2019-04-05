using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace.LibNamespace
{
    /// <summary>This is a struct with only optional properties.</summary>
    [JsiiByValue]
    public class StructWithOnlyOptionals : IStructWithOnlyOptionals
    {
        /// <summary>The first optional!</summary>
        [JsiiProperty("optional1", "{\"type\":{\"primitive\":\"string\"},\"optional\":true}", true)]
        public string Optional1
        {
            get;
            set;
        }

        [JsiiProperty("optional2", "{\"type\":{\"primitive\":\"number\"},\"optional\":true}", true)]
        public double? Optional2
        {
            get;
            set;
        }

        [JsiiProperty("optional3", "{\"type\":{\"primitive\":\"boolean\"},\"optional\":true}", true)]
        public bool? Optional3
        {
            get;
            set;
        }
    }
}