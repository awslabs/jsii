﻿using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace AWS.Jsii.JsonModel.Spec
{
    [JsonConverter(typeof(StringEnumConverter), /* camelCaseText */ true)]
    public enum CollectionKind
    {
        Array,
        Map
    }
}