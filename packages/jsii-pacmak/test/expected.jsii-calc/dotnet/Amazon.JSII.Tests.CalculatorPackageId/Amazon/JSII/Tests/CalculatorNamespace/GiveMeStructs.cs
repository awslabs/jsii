using Amazon.JSII.Runtime.Deputy;
using Amazon.JSII.Tests.CalculatorNamespace.LibNamespace;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    [JsiiClass(typeof(GiveMeStructs), "jsii-calc.GiveMeStructs", "[]")]
    public class GiveMeStructs : DeputyBase
    {
        public GiveMeStructs(): base(new DeputyProps(new object[]{}))
        {
        }

        protected GiveMeStructs(ByRefValue reference): base(reference)
        {
        }

        protected GiveMeStructs(DeputyProps props): base(props)
        {
        }

        [JsiiProperty("structLiteral", "{\"fqn\":\"@scope/jsii-calc-lib.StructWithOnlyOptionals\"}")]
        public virtual IStructWithOnlyOptionals StructLiteral
        {
            get => GetInstanceProperty<IStructWithOnlyOptionals>();
        }

        /// <remarks>summary: Accepts a struct of type DerivedStruct and returns a struct of type FirstStruct.</remarks>
        [JsiiMethod("derivedToFirst", "{\"fqn\":\"@scope/jsii-calc-lib.MyFirstStruct\"}", "[{\"name\":\"derived\",\"type\":{\"fqn\":\"jsii-calc.DerivedStruct\"}}]")]
        public virtual IMyFirstStruct DerivedToFirst(IDerivedStruct derived)
        {
            return InvokeInstanceMethod<IMyFirstStruct>(new object[]{derived});
        }

        /// <remarks>summary: Returns the boolean from a DerivedStruct struct.</remarks>
        [JsiiMethod("readDerivedNonPrimitive", "{\"fqn\":\"jsii-calc.DoubleTrouble\"}", "[{\"name\":\"derived\",\"type\":{\"fqn\":\"jsii-calc.DerivedStruct\"}}]")]
        public virtual DoubleTrouble ReadDerivedNonPrimitive(IDerivedStruct derived)
        {
            return InvokeInstanceMethod<DoubleTrouble>(new object[]{derived});
        }

        /// <remarks>summary: Returns the "anumber" from a MyFirstStruct struct;.</remarks>
        [JsiiMethod("readFirstNumber", "{\"primitive\":\"number\"}", "[{\"name\":\"first\",\"type\":{\"fqn\":\"@scope/jsii-calc-lib.MyFirstStruct\"}}]")]
        public virtual double ReadFirstNumber(IMyFirstStruct first)
        {
            return InvokeInstanceMethod<double>(new object[]{first});
        }
    }
}