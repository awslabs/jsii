using Amazon.JSII.Runtime.Deputy;

namespace Amazon.JSII.Tests.CalculatorNamespace
{
    [JsiiTypeProxy(typeof(IIInterfaceWithProperties), "jsii-calc.IInterfaceWithProperties")]
    internal sealed class IInterfaceWithPropertiesProxy : DeputyBase, IIInterfaceWithProperties
    {
        private IInterfaceWithPropertiesProxy(ByRefValue reference): base(reference)
        {
        }

        [JsiiProperty("readOnlyString", "{\"type\":{\"primitive\":\"string\"}}")]
        public string ReadOnlyString
        {
            get => GetInstanceProperty<string>();
        }

        [JsiiProperty("readWriteString", "{\"type\":{\"primitive\":\"string\"}}")]
        public string ReadWriteString
        {
            get => GetInstanceProperty<string>();
            set => SetInstanceProperty(value);
        }
    }
}