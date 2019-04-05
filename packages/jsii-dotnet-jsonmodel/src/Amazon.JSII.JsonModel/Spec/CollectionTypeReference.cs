﻿using Newtonsoft.Json;
using System;

namespace Amazon.JSII.JsonModel.Spec
{
    [JsonObject(MemberSerialization = MemberSerialization.OptIn)]
    public class CollectionTypeReference
    {
        public CollectionTypeReference(CollectionKind kind, TypeInstance elementType)
        {
            Kind = kind;
            ElementType = elementType ?? throw new ArgumentNullException(nameof(elementType));
        }

        [JsonProperty("kind")]
        public CollectionKind Kind { get; }

        [JsonProperty("elementtype")]
        public TypeInstance ElementType { get; }
    }
}