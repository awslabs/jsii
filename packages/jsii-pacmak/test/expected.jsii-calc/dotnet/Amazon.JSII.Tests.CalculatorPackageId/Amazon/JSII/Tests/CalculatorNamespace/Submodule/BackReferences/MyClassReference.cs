using Amazon.JSII.Runtime.Deputy;

#pragma warning disable CS0672,CS0809,CS1591

namespace Amazon.JSII.Tests.CalculatorNamespace.Submodule.BackReferences
{
    #pragma warning disable CS8618

    [JsiiByValue(fqn: "jsii-calc.submodule.back_references.MyClassReference")]
    public class MyClassReference : Amazon.JSII.Tests.CalculatorNamespace.Submodule.BackReferences.IMyClassReference
    {
        [JsiiProperty(name: "reference", typeJson: "{\"fqn\":\"jsii-calc.submodule.MyClass\"}", isOverride: true)]
        public Amazon.JSII.Tests.CalculatorNamespace.Submodule.MyClass Reference
        {
            get;
            set;
        }
    }
}
