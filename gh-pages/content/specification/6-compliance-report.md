# Compliance Report

This section details the current state of each language binding with respect to our standard compliance suite.

!!! Note
    The following languages are currently excluded from the tests and are marked as N/A:

    **dotnet**: Underwent a different compliance process. Will be aligned in the future.

    **python**: Underwent a different compliance process. Will be aligned in the future.

| number | test                                                              | description | java (100.00%) | golang (0.85%) | Dotnet | Python |
| ------ | ----------------------------------------------------------------- | ----------- | -------------- | -------------- | ------ | ------ |
| 1      | asyncOverrides_overrideCallsSuper                                 |             | ✅              | ❌              | N/A    | N/A    |
| 2      | arrayReturnedByMethodCanBeRead                                    |             | ✅              | ❌              | N/A    | N/A    |
| 3      | unionProperties                                                   |             | ✅              | ❌              | N/A    | N/A    |
| 4      | syncOverrides                                                     |             | ✅              | ❌              | N/A    | N/A    |
| 5      | useEnumFromScopedModule                                           |             | ✅              | ❌              | N/A    | N/A    |
| 6      | createObjectAndCtorOverloads                                      |             | ✅              | ❌              | N/A    | N/A    |
| 7      | fail_syncOverrides_callsDoubleAsync_method                        |             | ✅              | ❌              | N/A    | N/A    |
| 8      | collectionOfInterfaces_MapOfStructs                               |             | ✅              | ❌              | N/A    | N/A    |
| 9      | asyncOverrides_overrideAsyncMethod                                |             | ✅              | ❌              | N/A    | N/A    |
| 10     | statics                                                           |             | ✅              | ❌              | N/A    | N/A    |
| 11     | structs_returnedLiteralEqualsNativeBuilt                          |             | ✅              | ❌              | N/A    | N/A    |
| 12     | classesCanSelfReferenceDuringClassInitialization                  |             | ✅              | ❌              | N/A    | N/A    |
| 13     | canObtainStructReferenceWithOverloadedSetter                      |             | ✅              | ❌              | N/A    | N/A    |
| 14     | callbacksCorrectlyDeserializeArguments                            |             | ✅              | ❌              | N/A    | N/A    |
| 15     | canUseInterfaceSetters                                            |             | ✅              | ❌              | N/A    | N/A    |
| 16     | propertyOverrides_interfaces                                      |             | ✅              | ❌              | N/A    | N/A    |
| 17     | syncOverrides_callsSuper                                          |             | ✅              | ❌              | N/A    | N/A    |
| 18     | testJsiiAgent                                                     |             | ✅              | ❌              | N/A    | N/A    |
| 19     | doNotOverridePrivates_method_private                              |             | ✅              | ❌              | N/A    | N/A    |
| 20     | pureInterfacesCanBeUsedTransparently                              |             | ✅              | ❌              | N/A    | N/A    |
| 21     | nullShouldBeTreatedAsUndefined                                    |             | ✅              | ❌              | N/A    | N/A    |
| 22     | primitiveTypes                                                    |             | ✅              | ❌              | N/A    | N/A    |
| 23     | reservedKeywordsAreSlugifiedInClassProperties                     |             | ✅              | ❌              | N/A    | N/A    |
| 24     | objectIdDoesNotGetReallocatedWhenTheConstructorPassesThisOut      |             | ✅              | ❌              | N/A    | N/A    |
| 25     | interfaceBuilder                                                  |             | ✅              | ❌              | N/A    | N/A    |
| 26     | unionTypes                                                        |             | ✅              | ❌              | N/A    | N/A    |
| 27     | arrays                                                            |             | ✅              | ❌              | N/A    | N/A    |
| 28     | staticMapInClassCannotBeModified                                  |             | ✅              | ❌              | N/A    | N/A    |
| 29     | consts                                                            |             | ✅              | ❌              | N/A    | N/A    |
| 30     | pureInterfacesCanBeUsedTransparently_WhenTransitivelyImplementing |             | ✅              | ❌              | N/A    | N/A    |
| 31     | reservedKeywordsAreSlugifiedInMethodNames                         |             | ✅              | ❌              | N/A    | N/A    |
| 32     | exceptions                                                        |             | ✅              | ❌              | N/A    | N/A    |
| 33     | testLiteralInterface                                              |             | ✅              | ❌              | N/A    | N/A    |
| 34     | structs_nonOptionalhashCode                                       |             | ✅              | ❌              | N/A    | N/A    |
| 35     | propertyOverrides_set_throws                                      |             | ✅              | ❌              | N/A    | N/A    |
| 36     | canLeverageIndirectInterfacePolymorphism                          |             | ✅              | ❌              | N/A    | N/A    |
| 37     | fluentApi                                                         |             | ✅              | ❌              | N/A    | N/A    |
| 38     | staticListInClassCanBeReadCorrectly                               |             | ✅              | ❌              | N/A    | N/A    |
| 39     | mapReturnedByMethodCannotBeModified                               |             | ✅              | ❌              | N/A    | N/A    |
| 40     | receiveInstanceOfPrivateClass                                     |             | ✅              | ❌              | N/A    | N/A    |
| 41     | staticMapInClassCanBeReadCorrectly                                |             | ✅              | ❌              | N/A    | N/A    |
| 42     | testNativeObjectsWithInterfaces                                   |             | ✅              | ❌              | N/A    | N/A    |
| 43     | doNotOverridePrivates_property_getter_public                      |             | ✅              | ❌              | N/A    | N/A    |
| 44     | equalsIsResistantToPropertyShadowingResultVariable                |             | ✅              | ❌              | N/A    | N/A    |
| 45     | listInClassCanBeReadCorrectly                                     |             | ✅              | ❌              | N/A    | N/A    |
| 46     | useNestedStruct                                                   |             | ✅              | ❌              | N/A    | N/A    |
| 47     | testFluentApiWithDerivedClasses                                   |             | ✅              | ❌              | N/A    | N/A    |
| 48     | interfacesCanBeUsedTransparently_WhenAddedToJsiiType              |             | ✅              | ❌              | N/A    | N/A    |
| 49     | canOverrideProtectedGetter                                        |             | ✅              | ❌              | N/A    | N/A    |
| 50     | getAndSetEnumValues                                               |             | ✅              | ❌              | N/A    | N/A    |
| 51     | structs_nonOptionalequals                                         |             | ✅              | ❌              | N/A    | N/A    |
| 52     | testInterfaceParameter                                            |             | ✅              | ❌              | N/A    | N/A    |
| 53     | liftedKwargWithSameNameAsPositionalArg                            |             | ✅              | ❌              | N/A    | N/A    |
| 54     | creationOfNativeObjectsFromJavaScriptObjects                      |             | ✅              | ❌              | N/A    | N/A    |
| 55     | canOverrideProtectedMethod                                        |             | ✅              | ❌              | N/A    | N/A    |
| 56     | canLoadEnumValues                                                 |             | ✅              | ❌              | N/A    | N/A    |
| 57     | eraseUnsetDataValues                                              |             | ✅              | ❌              | N/A    | N/A    |
| 58     | maps                                                              |             | ✅              | ✅              | N/A    | N/A    |
| 59     | structs_containsNullChecks                                        |             | ✅              | ❌              | N/A    | N/A    |
| 60     | canOverrideProtectedSetter                                        |             | ✅              | ❌              | N/A    | N/A    |
| 61     | asyncOverrides_callAsyncMethod                                    |             | ✅              | ❌              | N/A    | N/A    |
| 62     | nodeStandardLibrary                                               |             | ✅              | ❌              | N/A    | N/A    |
| 63     | dates                                                             |             | ✅              | ❌              | N/A    | N/A    |
| 64     | collectionOfInterfaces_ListOfStructs                              |             | ✅              | ❌              | N/A    | N/A    |
| 65     | objRefsAreLabelledUsingWithTheMostCorrectType                     |             | ✅              | ❌              | N/A    | N/A    |
| 66     | unionPropertiesWithBuilder                                        |             | ✅              | ❌              | N/A    | N/A    |
| 67     | doNotOverridePrivates_property_getter_private                     |             | ✅              | ❌              | N/A    | N/A    |
| 68     | structs_withDiamondInheritance_correctlyDedupeProperties          |             | ✅              | ❌              | N/A    | N/A    |
| 69     | abstractMembersAreCorrectlyHandled                                |             | ✅              | ❌              | N/A    | N/A    |
| 70     | doNotOverridePrivates_property_by_name_private                    |             | ✅              | ❌              | N/A    | N/A    |
| 71     | testNullIsAValidOptionalMap                                       |             | ✅              | ❌              | N/A    | N/A    |
| 72     | mapReturnedByMethodCanBeRead                                      |             | ✅              | ❌              | N/A    | N/A    |
| 73     | structs_multiplePropertiesEquals                                  |             | ✅              | ❌              | N/A    | N/A    |
| 74     | mapInClassCanBeReadCorrectly                                      |             | ✅              | ❌              | N/A    | N/A    |
| 75     | staticListInClassCannotBeModified                                 |             | ✅              | ❌              | N/A    | N/A    |
| 76     | collectionOfInterfaces_MapOfInterfaces                            |             | ✅              | ❌              | N/A    | N/A    |
| 77     | asyncOverrides_overrideThrows                                     |             | ✅              | ❌              | N/A    | N/A    |
| 78     | callMethods                                                       |             | ✅              | ❌              | N/A    | N/A    |
| 79     | returnAbstract                                                    |             | ✅              | ❌              | N/A    | N/A    |
| 80     | dynamicTypes                                                      |             | ✅              | ❌              | N/A    | N/A    |
| 81     | hashCodeIsResistantToPropertyShadowingResultVariable              |             | ✅              | ❌              | N/A    | N/A    |
| 82     | returnSubclassThatImplementsInterface976                          |             | ✅              | ❌              | N/A    | N/A    |
| 83     | structs_optionalEquals                                            |             | ✅              | ❌              | N/A    | N/A    |
| 84     | propertyOverrides_get_calls_super                                 |             | ✅              | ❌              | N/A    | N/A    |
| 85     | unmarshallIntoAbstractType                                        |             | ✅              | ❌              | N/A    | N/A    |
| 86     | structs_multiplePropertiesHashCode                                |             | ✅              | ❌              | N/A    | N/A    |
| 87     | fail_syncOverrides_callsDoubleAsync_propertyGetter                |             | ✅              | ❌              | N/A    | N/A    |
| 88     | propertyOverrides_get_set                                         |             | ✅              | ❌              | N/A    | N/A    |
| 89     | variadicMethodCanBeInvoked                                        |             | ✅              | ❌              | N/A    | N/A    |
| 90     | collectionTypes                                                   |             | ✅              | ❌              | N/A    | N/A    |
| 91     | asyncOverrides_overrideAsyncMethodByParentClass                   |             | ✅              | ❌              | N/A    | N/A    |
| 92     | structs_optionalHashCode                                          |             | ✅              | ❌              | N/A    | N/A    |
| 93     | testStructsCanBeDowncastedToParentType                            |             | ✅              | ❌              | N/A    | N/A    |
| 94     | propertyOverrides_get_throws                                      |             | ✅              | ❌              | N/A    | N/A    |
| 95     | getSetPrimitiveProperties                                         |             | ✅              | ❌              | N/A    | N/A    |
| 96     | getAndSetNonPrimitiveProperties                                   |             | ✅              | ❌              | N/A    | N/A    |
| 97     | reservedKeywordsAreSlugifiedInStructProperties                    |             | ✅              | ❌              | N/A    | N/A    |
| 98     | fail_syncOverrides_callsDoubleAsync_propertySetter                |             | ✅              | ❌              | N/A    | N/A    |
| 99     | doNotOverridePrivates_method_public                               |             | ✅              | ❌              | N/A    | N/A    |
| 100    | testNullIsAValidOptionalList                                      |             | ✅              | ❌              | N/A    | N/A    |
| 101    | mapInClassCannotBeModified                                        |             | ✅              | ❌              | N/A    | N/A    |
| 102    | doNotOverridePrivates_property_by_name_public                     |             | ✅              | ❌              | N/A    | N/A    |
| 103    | asyncOverrides_twoOverrides                                       |             | ✅              | ❌              | N/A    | N/A    |
| 104    | propertyOverrides_set_calls_super                                 |             | ✅              | ❌              | N/A    | N/A    |
| 105    | iso8601DoesNotDeserializeToDate                                   |             | ✅              | ❌              | N/A    | N/A    |
| 106    | collectionOfInterfaces_ListOfInterfaces                           |             | ✅              | ❌              | N/A    | N/A    |
| 107    | undefinedAndNull                                                  |             | ✅              | ❌              | N/A    | N/A    |
| 108    | structs_serializeToJsii                                           |             | ✅              | ❌              | N/A    | N/A    |
| 109    | structsAreUndecoratedOntheWayToKernel                             |             | ✅              | ❌              | N/A    | N/A    |
| 110    | canObtainReferenceWithOverloadedSetter                            |             | ✅              | ❌              | N/A    | N/A    |
| 111    | testJSObjectLiteralToNative                                       |             | ✅              | ❌              | N/A    | N/A    |
| 112    | structs_stepBuilders                                              |             | ✅              | ❌              | N/A    | N/A    |
| 113    | classWithPrivateConstructorAndAutomaticProperties                 |             | ✅              | ❌              | N/A    | N/A    |
| 114    | arrayReturnedByMethodCannotBeModified                             |             | ✅              | ❌              | N/A    | N/A    |
| 115    | correctlyDeserializesStructUnions                                 |             | ✅              | ❌              | N/A    | N/A    |
| 116    | subclassing                                                       |             | ✅              | ❌              | N/A    | N/A    |
| 117    | testInterfaces                                                    |             | ✅              | ❌              | N/A    | N/A    |