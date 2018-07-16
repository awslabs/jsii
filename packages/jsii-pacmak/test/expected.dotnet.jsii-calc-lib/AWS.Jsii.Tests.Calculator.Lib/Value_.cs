using AWS.Jsii.Runtime.Deputy;
using AWS.Jsii.Tests.Calculator.Base;

namespace AWS.Jsii.Tests.Calculator.Lib
{
    /// <summary>Abstract class which represents a numeric value.</summary>
    [JsiiClass(typeof(Value_), "@scope/jsii-calc-lib.Value", "[]")]
    public abstract class Value_ : Base.Base
    {
        protected Value_(): base(new DeputyProps(new object[]{}))
        {
        }

        protected Value_(ByRefValue reference): base(reference)
        {
        }

        protected Value_(DeputyProps props): base(props)
        {
        }

        /// <summary>The value.</summary>
        [JsiiProperty("value", "{\"primitive\":\"number\"}")]
        public virtual double Value
        {
            get => GetProperty<double>();
        }

        /// <summary>String representation of the value.</summary>
        [JsiiMethod("toString", "{\"primitive\":\"string\"}", "[]")]
        public override string ToString()
        {
            return InvokeMethod<string>(new object[]{});
        }
    }
}