using AWS.Jsii.Runtime.Deputy;

namespace AWS.Jsii.Tests.Calculator
{
    [JsiiClass("jsii-calc", "jsii$jsii_calc$.UsesInterfaceWithProperties", "[{\"name\":\"obj\",\"type\":{\"fqn\":\"jsii$jsii_calc$.IInterfaceWithProperties\"}}]")]
    public class UsesInterfaceWithProperties : DeputyBase
    {
        public UsesInterfaceWithProperties(IIInterfaceWithProperties obj): base(new DeputyProps(new object[]{obj}))
        {
        }

        protected UsesInterfaceWithProperties(ByRefValue reference): base(reference)
        {
        }

        protected UsesInterfaceWithProperties(DeputyProps props): base(props)
        {
        }

        [JsiiProperty("obj", "{\"fqn\":\"jsii$jsii_calc$.IInterfaceWithProperties\"}")]
        public virtual IIInterfaceWithProperties Obj
        {
            get => GetProperty<IIInterfaceWithProperties>();
        }

        [JsiiMethod("justRead", "{\"primitive\":\"string\"}", "[]")]
        public virtual string JustRead()
        {
            return InvokeMethod<string>(new object[]{});
        }

        [JsiiMethod("writeAndRead", "{\"primitive\":\"string\"}", "[{\"name\":\"value\",\"type\":{\"primitive\":\"string\"}}]")]
        public virtual string WriteAndRead(string value)
        {
            return InvokeMethod<string>(new object[]{value});
        }

        [JsiiMethod("readStringAndNumber", "{\"primitive\":\"string\"}", "[{\"name\":\"ext\",\"type\":{\"fqn\":\"jsii$jsii_calc$.IInterfaceWithPropertiesExtension\"}}]")]
        public virtual string ReadStringAndNumber(IIInterfaceWithPropertiesExtension ext)
        {
            return InvokeMethod<string>(new object[]{ext});
        }
    }
}