---
layout: post
title: global return code and log libraries
categories: [bugfree-robot]
tags: [embedded, TDD, programming]
comments: true
footnote: The second stage has started
---

All my articles in the `bugfree_robot` project until now were dedicated to detailing Test Driven Development, its setup and basic steps. I've described all those steps in a slow pace and very detailed manner. At this moment the project base is ready as well as simpler test features that will reflect the majority of the tests in many embedded projects. 

The goal from now on is developing many libraries for the firmware while defining an architecture that will connect all those low and high level libraries. The concepts already shown about setting up test files and inserting them in the `Makefile` won't be written in the articles from now on but will always be available in the commits of course. Any new important coding and test technique used in the code will be presented and described in the article.

So with all this out, it is time to move on with the firmware. This step is about coding two new libraries. One of them is nothing more than a header file actually, but it is an important one. They are:

- return codes library
- log utility library

<!--more-->

---

## Return codes library

The previous firmware projects that I've worked on taught me about the value of using a global return codes structure for as much as possible in all the firmware libraries for a project. It helps on keeping consistency along the project and make it easier to check error codes when higher level libraries call lower level libraries methods. You can get a full mess and many errors if a source code needs to check multiple error codes from the many libraries that it includes and return its own error codes besides that. 

This library is nothing more than a header file with a `typedef enum` holding all the return codes we intend on using. I've used a long list of return codes before, organizing them by types (communication, resources, parameters) but realized that in the end it doesn't even matter. I've ended up using the simpler ones (OK, ERROR, INVALID_PARAM) instead of the most descriptive ones. This library will start simple for this reason, so all that it holds is this:

```c
typedef enum {
    RET_OK,
    RET_ERROR,
    RET_RESOURCE_UNAVAILABLE,
    RET_WRONG_PARAM,
}retcode_t;
```

The file is called `retcode.h` and was placed inside a new `utils` folder, at the same level of our `drivers` folder. Using it is as simple as including the header file and setting `retcode_t` as the function return type. 

> `error_t` would be a great name for this new type but don't do it to yourself. This is such a good name that many libraries (even standard GCC) are already using it. This comes back as a regret later in the shape of multiple build redefinition errors. I've been there and trying to surround the definition errors to make the tests run is not a battle worth of fighting.

---

## Log utility library

This is a library that I've never implemented in a project but always wanted too. The objective is providing functions that will print messages for any other library that needs to do this. Any type of direct call to `printf` or `uart_write` methods will be replaced by functions from this library. This will allow including problems with multiples calls trying to use the same print resource at concurrently and resulting in print errors (remember that this project will include a RTOS so multiple tasks will run in preemptive time sharing). 

This library has these resources:

- print messages with a priority level and variable parameters to construct the string, working as a traditional `printf` function
- set debug level in runtime so any message with lower priority level will be ignored
- set maximum length in runtime
- set callback function pointer that actually calls the print method function (UART, USB, etc)

### Variable parameters
Implementing the print function required using variable arguments in the function call. That is not an everyday knowledge while coding, mainly in C. The print function ended up with this prototype:

```c
retcode_t log_print (loglevel_t msg_lvl, const char * format, ...)
```

It this is the first time you see this kind of implementation, don't worry, I understand what you are thinking:
> What should I do with these `...` ??
> How to access the multiple parameters ??

It is funny though that one of the first things we use to learn in `C` is:

```c
printf ("Hello world \n");
printf ("var1: %d, var2: %d, var3: %f\n", 1, 42, 3.14159);
```

And there it is already, the variable parameters list in a function call, and we've never stopped to think about how this is working.

The `...` is a special token that marks this as a `variadic function`, i.e., one that accepts a variable number of arguments. This behavior is available in many languages. The C standard library provides a header to allow working with this: `stdarg.h`. I recommend reading the [Wikipedia article](https://en.wikipedia.org/wiki/Stdarg.h) about it. It provides a variable type and a few macros that will allow using the variable parameters:

- `va_list`: type for iterating arguments
- `va_start`: start iterating arguments with a `va_list`
- `va_arg`: retrieve an argument
- `va_end`: free a `va_list`

The most interesting part of implementation of the print function is shown here: 

```c
retcode_t log_print (loglevel_t msg_lvl, const char * format, ...){
    // (..) hidden start code

    char dest[max_len + 1];
    uint16_t msg_len = 0;
    va_list argptr;
    va_start(argptr, format);
    msg_len = (uint16_t) vsnprintf(dest, (size_t)max_len + 1, format, argptr);
    va_end(argptr);

    // (..) hidden end code
}
```

This code section shows that I've cheated in a way. I've chosen not dealing manually with the variable arguments list but forwarding this task to the function `vsnprintf`. It is provided by `stdio.h` and works similar to `snprinf` but receives the variable arguments list (`format`, `argptr`) as parameters when called. This will require that my function initializes and finalizes the arguments list, but it won't need to really deal with it.

I know that *printfish* functions may result in a big (really big) overhead for embedded systems, incrementing code size and (mainly) stack memory use anywhere they are called. I've chosen to use them anyway at this stage so my lib will work as expected for some time. It will probably require a refactoring later, replacing the standard C library by a simpler one that is implemented for embedded systems or implementing my own (I hope to not get this deep). The tests implemented for the library will help here since any changes in the library core must satisfy them. 


The log library is simple and limited at this moment so I'll list here some future work intended to improve it:
- add more specific functions with simpler calls as one to transmit an int value and a string, float value and string, etc
- allow multiple callback functions
- other functions required by multiple libraries that are worth merging here


### withMemoryBufferParameter()

Since I've brought the subject of tests up, the ones coded for this library use a very useful CppUMock resource called: `withMemoryBufferParameter()`. It is intended to check calls to functions that receive a memory buffer when you are not interested in the memory location (pointer value) but rather its content. It works by setting the name, content and length expected to a certain function argument and by doing the same on the function mock, informing that a argument buffer was received with some content on it. The expectations check stage will verify if the expected content was received correctly. It may seem complicated but it gets easy in no time. 

This is a test that sets a expected call for function `mock_print` with a buffer variable called `msg` that contains the string `"mock test 1"` of length `11`. I'm typing the full string in the expected value but a pointer would work as well.

```cpp
TEST (log_mock_print, mock_print){
    mock_c()->expectOneCall("mock_print")
    ->withMemoryBufferParameter("msg", (const unsigned char*) "mock test 1", 11)
    ->withUnsignedIntParameters("msg_len", 11);
    ret = mock_print("mock test 1", 11);
    CHECK_EQUAL(RET_OK, ret);
}
```

And this is the function implementation that will inform the mock framework that it was called with some buffer argument. I'm passing the buffer pointer and `msg_len` as the buffer length here. The `(const unsigned char*)` typecast is inserted to avoid build warnings/errors and has no effective purpose.

```cpp
retcode_t mock_print (const char* msg, uint16_t msg_len){
    return (retcode_t) mock_c()->actualCall("mock_print")
        ->withMemoryBufferParameter("msg", (const unsigned char*)msg, msg_len)
        ->withUnsignedIntParameters("msg_len", msg_len)
        ->returnUnsignedIntValueOrDefault(RET_OK);
}
```

This feature reports very detailed error messages when the expectations are not exactly met.

This one shows a content error. I've intentionally inserted an error in the last character of the expectation by replacing an '1' (0x31 in ascii) by an '2' (0x32 in ascii).

```
bugfree_robot/test/utils/test_log.cpp:86: error: Failure in TEST(log_mock_print, mock_print)
    Mock Failure: Unexpected parameter value to parameter "msg" to function "mock_print": <Size = 11 | HexContents = 6D 6F 63 6B 20 74 65 73 74 20 31>
    EXPECTED calls that WERE NOT fulfilled related to function: mock_print
        mock_print -> const unsigned char* msg: <Size = 11 | HexContents = 6D 6F 63 6B 20 74 65 73 74 20 32>, unsigned int msg_len: <11 (0xb)> (expected 1 call, called 0 times)
    EXPECTED calls that WERE fulfilled related to function: mock_print
        <none>
    ACTUAL unexpected parameter passed to function: mock_print
        const unsigned char* msg: <Size = 11 | HexContents = 6D 6F 63 6B 20 74 65 73 74 20 31>
```

And this one shows a length error since I've set an expected length as 10 but the actual call received a 11.

```
bugfree_robot/test/utils/test_log.cpp:86: error: Failure in TEST(log_mock_print, mock_print)
    Mock Failure: Unexpected parameter value to parameter "msg" to function "mock_print": <Size = 11 | HexContents = 6D 6F 63 6B 20 74 65 73 74 20 31>
    EXPECTED calls that WERE NOT fulfilled related to function: mock_print
        mock_print -> const unsigned char* msg: <Size = 10 | HexContents = 6D 6F 63 6B 20 74 65 73 74 20>, unsigned int msg_len: <11 (0xb)> (expected 1 call, called 0 times)
    EXPECTED calls that WERE fulfilled related to function: mock_print
        <none>
    ACTUAL unexpected parameter passed to function: mock_print
        const unsigned char* msg: <Size = 11 | HexContents = 6D 6F 63 6B 20 74 65 73 74 20 31>
```

### andReturnUnsignedIntValue() / returnUnsignedIntValueOrDefault()

My last test example shows the use of another CppUMock feature called `returnUnsignedIntValueOrDefault()`. This one comes in many variations for diverse variable types, including or not the `orDefault` part and argument. It is useful to inform a expected call that it should return some value when called during a test. Let me show a few tests and functions with it.

**- Example 1:**

I'll set an expected call to function `mock_a`, request that it returns 1 when executed and check if it did it.

```cpp
TEST (expect_return, unsignedInt){
    mock_c()->expectOneCall("mock_a")
    ->andReturnUnsignedIntValue(1);
    CHECK_EQUAL(1, mock_a());
}
```

This function will be implemented as:

```cpp
unsigned int mock_a (void){
    return mock_c()->returnUnsignedIntValue();
}
```

**- Example 2:**

The last example presents an undefined behavior when the test does not set the `andReturnUnsignedIntValue()` and the `mock_a` function is called. I've realized that it usually returns `0` in this situation but, you never know right? It may be a good idea adding the `OrDefault` part in the mock function implementation and a test to check it too.

```cpp
TEST (expect_return, unsignedInt_check_default){
    mock_c()->expectOneCall("mock_a");
    CHECK_EQUAL(2, mock_a());
}
```

This function implementation got changed to:

```cpp
unsigned int mock_a (void){
    return mock_c()->returnUnsignedIntValueOrDefault(2);
}
```

Setting a default return value with the most common return value that you'll use in the tests helps on reducing the test code size since you can decide to omit this part of the expectation setup. This is the reason I've used `->returnUnsignedIntValueOrDefault(RET_OK);` in the last `mock_print()` implementation. Always remember to include tests for mock functions that will check the expected return values and the default return values too. 



### FUNCTIONPOINTERS_EQUAL

This is a basic one but worth mentioning. I've used this CppUTest macro to check that my `log_set_callback` and `log_get_callback` functions are working properly. This macro will verify that the two function pointers are equal. It is similar to `POINTERS_EQUAL` and you could probably use the pointers check instead although it helps on keeping the code organized and may reduce warnings while building the tests. 

CppUTest folder has a file that holds all the comparison macros it provides and is always a good idea to consult it. It is located at: `bugfree_robot/test/cpputest/include/CppUTest/UtestMacros.h`

---

[This commit](https://github.com/matheusmbar/bugfree_robot/commit/db8fe934d9d1393b4b1253c3848b2f3181dcda68) reflects the code at this point. Most of the code referenced here was added in the [previous commit](https://github.com/matheusmbar/bugfree_robot/commit/6c09c06f98076afa80473fa2969e8872024fabac) so remember this when looking for the changes.  

