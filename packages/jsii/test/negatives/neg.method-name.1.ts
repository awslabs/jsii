///!MATCH_ERROR: 'METHOD' must use camel-case

export class MyClass {
    METHOD() {
        return "hi";
    }
}
