using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    #pragma warning disable CS8618

    /// <summary>A struct which derives from another struct.</summary>
    [JsiiByValue(fqn: "jsii-calc.DerivedStruct")]
    public class DerivedStruct : Amazon.JSII.Tests.CalculatorNamespace.IDerivedStruct
    {
        [JsiiProperty(name: "anotherRequired", typeJson: "{\"primitive\":\"date\"}", isOverride: true)]
        public System.DateTime AnotherRequired
        {
            get;
            set;
        }

        [JsiiProperty(name: "bool", typeJson: "{\"primitive\":\"boolean\"}", isOverride: true)]
        public bool Bool
        {
            get;
            set;
        }

        /// <summary>An example of a non primitive property.</summary>
        [JsiiProperty(name: "nonPrimitive", typeJson: "{\"fqn\":\"jsii-calc.DoubleTrouble\"}", isOverride: true)]
        public Amazon.JSII.Tests.CalculatorNamespace.DoubleTrouble NonPrimitive
        {
            get;
            set;
        }

        /// <summary>This is optional.</summary>
        [JsiiOptional]
        [JsiiProperty(name: "anotherOptional", typeJson: "{\"collection\":{\"elementtype\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"},\"kind\":\"map\"}}", isOptional: true, isOverride: true)]
        public System.Collections.Generic.IDictionary<string, Amazon.JSII.Tests.CalculatorNamespace.LibNamespace.Value_>? AnotherOptional
        {
            get;
            set;
        }

        [JsiiOptional]
        [JsiiProperty(name: "optionalAny", typeJson: "{\"primitive\":\"any\"}", isOptional: true, isOverride: true)]
        public object? OptionalAny
        {
            get;
            set;
        }

        [JsiiOptional]
        [JsiiProperty(name: "optionalArray", typeJson: "{\"collection\":{\"elementtype\":{\"primitive\":\"string\"},\"kind\":\"array\"}}", isOptional: true, isOverride: true)]
        public string[]? OptionalArray
        {
            get;
            set;
        }

        /// <summary>An awesome number value. (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiProperty(name: "anumber", typeJson: "{\"primitive\":\"number\"}", isOverride: true)]
        [System.Obsolete()]
        public double Anumber
        {
            get;
            set;
        }

        /// <summary>A string value. (deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiProperty(name: "astring", typeJson: "{\"primitive\":\"string\"}", isOverride: true)]
        [System.Obsolete()]
        public string Astring
        {
            get;
            set;
        }

        /// <summary>(deprecated)</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Deprecated
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "firstOptional", typeJson: "{\"collection\":{\"elementtype\":{\"primitive\":\"string\"},\"kind\":\"array\"}}", isOptional: true, isOverride: true)]
        [System.Obsolete()]
        public string[]? FirstOptional
        {
            get;
            set;
        }
    }
}
