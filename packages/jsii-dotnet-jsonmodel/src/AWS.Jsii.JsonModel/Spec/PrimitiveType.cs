﻿using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace AWS.Jsii.JsonModel.Spec
{
    [JsonConverter(typeof(StringEnumConverter), /* camelCaseText */ true)]
    public enum PrimitiveType
    {
        Date,
        String,
        Number,
        Boolean,
        Json,
        Any
    }
}