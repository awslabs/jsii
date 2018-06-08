﻿using Newtonsoft.Json;
using System;

namespace AWS.Jsii.JsonModel.Api.Request
{
    [JsonObject(MemberSerialization = MemberSerialization.OptIn)]
    public class GetRequest : IKernelRequest
    {
        public GetRequest(ObjectReference objectReference, string property)
        {
            ObjectReference = objectReference ?? throw new ArgumentNullException(nameof(objectReference));
            Property = property ?? throw new ArgumentNullException(nameof(property));
        }

        [JsonProperty("api")]
        public string Api { get; } = "get";

        [JsonProperty("objref")]
        public ObjectReference ObjectReference { get; }

        [JsonProperty("property")]
        public string Property { get; }
    }
}