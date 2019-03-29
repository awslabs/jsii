using Amazon.JSII.Runtime.Deputy;
using Amazon.JSII.Tests.CalculatorNamespace.LibNamespace;
using System.Collections.Generic;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    /// <remarks>summary: Verify that object references can be passed inside collections.</remarks>
    [JsiiClass(typeof(ObjectRefsInCollections), "jsii-calc.ObjectRefsInCollections", "[]")]
    public class ObjectRefsInCollections : DeputyBase
    {
        public ObjectRefsInCollections(): base(new DeputyProps(new object[]{}))
        {
        }

        protected ObjectRefsInCollections(ByRefValue reference): base(reference)
        {
        }

        protected ObjectRefsInCollections(DeputyProps props): base(props)
        {
        }

        /// <remarks>summary: Returns the sum of all values.</remarks>
        [JsiiMethod("sumFromArray", "{\"primitive\":\"number\"}", "[{\"name\":\"values\",\"type\":{\"collection\":{\"kind\":\"array\",\"elementtype\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"}}}}]")]
        public virtual double SumFromArray(Value_[] values)
        {
            return InvokeInstanceMethod<double>(new object[]{values});
        }

        /// <remarks>summary: Returns the sum of all values in a map.</remarks>
        [JsiiMethod("sumFromMap", "{\"primitive\":\"number\"}", "[{\"name\":\"values\",\"type\":{\"collection\":{\"kind\":\"map\",\"elementtype\":{\"fqn\":\"@scope/jsii-calc-lib.Value\"}}}}]")]
        public virtual double SumFromMap(IDictionary<string, Value_> values)
        {
            return InvokeInstanceMethod<double>(new object[]{values});
        }
    }
}