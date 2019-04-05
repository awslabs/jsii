using Amazon.JSII.Runtime.Deputy;
using Amazon.JSII.Tests.CalculatorNamespace.composition;
using Amazon.JSII.Tests.CalculatorNamespace.LibNamespace;
using System.Collections.Generic;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <summary>A calculator which maintains a current value and allows adding operations.</summary>
    [JsiiClass(typeof(Calculator), "jsii-calc.Calculator", "[{\"name\":\"props\",\"value\":{\"type\":{\"fqn\":\"jsii-calc.CalculatorProps\"},\"optional\":true}}]")]
    public class Calculator : CompositeOperation_
    {
        public Calculator(ICalculatorProps props): base(new DeputyProps(new object[]{props}))
        {
        }

        protected Calculator(ByRefValue reference): base(reference)
        {
        }

        protected Calculator(DeputyProps props): base(props)
        {
        }

        /// <summary>Returns the expression.</summary>
        [JsiiProperty("expression", "{\"type\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"}}")]
        public override Value_ Expression
        {
            get => GetInstanceProperty<Value_>();
        }

        /// <summary>A log of all operations.</summary>
        [JsiiProperty("operationsLog", "{\"type\":{\"collection\":{\"kind\":\"array\",\"elementtype\":{\"type\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"}}}}}")]
        public virtual Value_[] OperationsLog
        {
            get => GetInstanceProperty<Value_[]>();
        }

        /// <summary>A map of per operation name of all operations performed.</summary>
        [JsiiProperty("operationsMap", "{\"type\":{\"collection\":{\"kind\":\"map\",\"elementtype\":{\"type\":{\"collection\":{\"kind\":\"array\",\"elementtype\":{\"type\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"}}}}}}}}")]
        public virtual IDictionary<string, Value_[]> OperationsMap
        {
            get => GetInstanceProperty<IDictionary<string, Value_[]>>();
        }

        /// <summary>The current value.</summary>
        [JsiiProperty("curr", "{\"type\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"}}")]
        public virtual Value_ Curr
        {
            get => GetInstanceProperty<Value_>();
            set => SetInstanceProperty(value);
        }

        /// <summary>The maximum value allows in this calculator.</summary>
        [JsiiProperty("maxValue", "{\"type\":{\"primitive\":\"number\"},\"optional\":true}")]
        public virtual double? MaxValue
        {
            get => GetInstanceProperty<double? >();
            set => SetInstanceProperty(value);
        }

        /// <summary>Example of a property that accepts a union of types.</summary>
        [JsiiProperty("unionProperty", "{\"type\":{\"union\":{\"types\":[{\"type\":{\"fqn\":\"jsii-calc.Add\"}},{\"type\":{\"fqn\":\"jsii-calc.Multiply\"}},{\"type\":{\"fqn\":\"jsii-calc.Power\"}}]}},\"optional\":true}")]
        public virtual object UnionProperty
        {
            get => GetInstanceProperty<object>();
            set => SetInstanceProperty(value);
        }

        /// <summary>Adds a number to the current value.</summary>
        [JsiiMethod("add", null, "[{\"name\":\"value\",\"value\":{\"type\":{\"primitive\":\"number\"}}}]")]
        public virtual void Add(double value)
        {
            InvokeInstanceVoidMethod(new object[]{value});
        }

        /// <summary>Multiplies the current value by a number.</summary>
        [JsiiMethod("mul", null, "[{\"name\":\"value\",\"value\":{\"type\":{\"primitive\":\"number\"}}}]")]
        public virtual void Mul(double value)
        {
            InvokeInstanceVoidMethod(new object[]{value});
        }

        /// <summary>Negates the current value.</summary>
        [JsiiMethod("neg", null, "[]")]
        public virtual void Neg()
        {
            InvokeInstanceVoidMethod(new object[]{});
        }

        /// <summary>Raises the current value by a power.</summary>
        [JsiiMethod("pow", null, "[{\"name\":\"value\",\"value\":{\"type\":{\"primitive\":\"number\"}}}]")]
        public virtual void Pow(double value)
        {
            InvokeInstanceVoidMethod(new object[]{value});
        }

        /// <summary>Returns teh value of the union property (if defined).</summary>
        [JsiiMethod("readUnionValue", "{\"type\":{\"primitive\":\"number\"}}", "[]")]
        public virtual double ReadUnionValue()
        {
            return InvokeInstanceMethod<double>(new object[]{});
        }
    }
}