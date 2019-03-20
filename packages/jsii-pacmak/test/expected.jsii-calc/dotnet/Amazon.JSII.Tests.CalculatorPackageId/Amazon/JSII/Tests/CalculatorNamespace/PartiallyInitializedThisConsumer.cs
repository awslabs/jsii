using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    [JsiiClass(typeof(PartiallyInitializedThisConsumer), "jsii-calc.PartiallyInitializedThisConsumer", "[]")]
    public abstract class PartiallyInitializedThisConsumer : DeputyBase
    {
        protected PartiallyInitializedThisConsumer(): base(new DeputyProps(new object[]{}))
        {
        }

        protected PartiallyInitializedThisConsumer(ByRefValue reference): base(reference)
        {
        }

        protected PartiallyInitializedThisConsumer(DeputyProps props): base(props)
        {
        }

        [JsiiMethod("consumePartiallyInitializedThis", "{\"primitive\":\"string\"}", "[{\"name\":\"obj\",\"type\":{\"fqn\":\"jsii-calc.ConstructorPassesThisOut\"}}]")]
        public abstract string ConsumePartiallyInitializedThis(ConstructorPassesThisOut obj);
    }
}