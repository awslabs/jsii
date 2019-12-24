using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>Host runtime version should be set via JSII_AGENT.</summary>
    /// <remarks>
    /// <strong>Stability</strong>: Experimental
    /// </remarks>
    [JsiiClass(nativeType: typeof(Amazon.JSII.Tests.CalculatorNamespace.JsiiAgent_), fullyQualifiedName: "jsii-calc.JsiiAgent")]
    public class JsiiAgent_ : DeputyBase
    {
        /// <summary></summary>
        public JsiiAgent_(): base(new DeputyProps(new object[]{}))
        {
        }

<<<<<<< HEAD
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
=======
        /// <summary>Used by jsii to construct an instance of this class from a Javascript-owned object reference</summary>
        /// <param name="reference">The Javascript-owned object reference</param>
>>>>>>> origin/master
        protected JsiiAgent_(ByRefValue reference): base(reference)
        {
        }

<<<<<<< HEAD
        [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
=======
        /// <summary>Used by jsii to construct an instance of this class from DeputyProps</summary>
        /// <param name="props">The deputy props</param>
>>>>>>> origin/master
        protected JsiiAgent_(DeputyProps props): base(props)
        {
        }

        /// <summary>Returns the value of the JSII_AGENT environment variable.</summary>
        /// <remarks>
        /// <strong>Stability</strong>: Experimental
        /// </remarks>
        [JsiiOptional]
        [JsiiProperty(name: "jsiiAgent", typeJson: "{\"primitive\":\"string\"}", isOptional: true)]
        public static string JsiiAgent
        {
            get => GetStaticProperty<string>(typeof(Amazon.JSII.Tests.CalculatorNamespace.JsiiAgent_));
        }
    }
}
