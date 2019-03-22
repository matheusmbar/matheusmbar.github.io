---
layout: post
title: what is test driven development
categories: [bugfree-robot]
tags: [TDD, embedded, programming,code]
comments: true
footnote: CHECK_EQUAL(2, 0b10)
---

Making sure that the source code functions are running and executing everything they are expected to is a really great challenge. The importance of that gets bigger everytime a new library is built and depends on other functions. A basic function that fails can cause serious damage inside a complete firmware.

Test Driven Development (TDD) is a tecnique intended to make sure that the source code is correctly coded and tested in most of the possible use cases for it. The programmer will write the test code that calls the functions and check their behavior and return values with different input parameters. The objective is to add as many tests as required to let no unmapped scenario to fail. 

The development process can be summarized in:
1. Understand a new code requirement
1. Code the a new test
1. Make it compile
1. Run the tests
1. Check that it failed
1. Implement the source code (just enough to make the test pass)
1. Compile and run
1. Check if the tests passed
1. Repeat

<!--more-->

In order to develop the tests, it is required to use some kind of framework that is going to provide the test tools. Nothing more than a really big chunk of source code, libraries and tools that will get compiled with the tests and the project's source code, returning the result of every check executed. 

[Cpputest](https://cpputest.github.io/) is my personal choice for that. It is open source, free to use and widely accepted in the C/C++ development community. There is a large set of tools to execute many kind of checks and a mock library is included too (more about _mock library_ in a latter post). It is coded in C++ but is able to work with C and C++ code, so no need to get afraid due to its sugestive CPP name. 

[Google Test](https://github.com/google/googletest) is a great and open source tool that is coded in C++ and includes a mock tool (Google Mock), but it works ONLY to test C++ source code. This is a major drawback since most of the manufacturer libraries provided for embedded development is coded in C without C++ support and C++ compilers for embedded are not so common neither some efficient some times. C++ is a great tool but I still don't see it with many advantages over C for not advanced embedded programming. 

[CUnit](http://cunit.sourceforge.net/) is another famous tool, coded completely in C and works just for C. The fact that it is coded in C requires some additional steps to inform the test code about every new test added, what increases the chance of mistakes as keeping tests out of execution without realizing it. Its development seems to be stagnant for a few years now.

All the code around here will be built with Cpputest, but the TDD development cycle is really similar in any framework. The requirement is about learning how to set the environment to compile correctly, identify the test groups, test cases and the function calls. Almost any programming language has some test frameworks, so make sure to look for it even when coding for Python, Ruby, JavaScript, etc out of the embedded world.

---

Let's develop a small test example to show a fell of the TDD workflow. The development of a multiplication function is required. It will receive two parameters (positive or negative) and return its product (positive or negative).Input parameters are 8bits long (-128 to 127) and the return shall not overflow. It will be called `multiply()`

The next post will be just about setting a new project to build tests with Cpputest, at this point I'm hiding some of the setup code and keeping the focus on the test itself. 

This function must work with two positive parameters, this is a test for that:

```C
TEST(multiply_funtion, two_positives){
	CHECK_EQUAL(2, multiply(1,2));
}
``` 

The `CHECK_EQUAL(expected, value)` macro will execute the `multiply(1,2)` and check if its return value is equal to the `expected` value provided. This macro is really universal and will work for almost any integer variable type by executing multiple comparisons automatically. Float and double are trickier and require more refined comparison function (another future topic on the [list](https://github.com/matheusmbar/matheusmbar.github.io/issues/2)). 

This code won't compile if `multiply(a,b)` is not defined, so let's do it now:

```C
uint8_t multiply (uint8_t a, uint8_t b){
	return 0;
}
``` 

Hold on the desire to code the multiplication code, it is not time for that yet. It is time to CODE, COMPILE and WATCH IT FAIL. Cpputest will execute and return the following error message:

```
bugfree_robot/test/multiply_test.cpp:11: error: Failure in TEST(multiply_funtion, two_positives)
	expected <2>
	but was  <0>
	difference starts at position 0 at: <          0         >
	                                               ^
.
Errors (1 failures, 1 tests, 1 ran, 1 checks, 0 ignored, 0 filtered out, 0 ms)

```

It's that clear right? It even says that the error is in the test at line 11 of test source code `multiply_test.cpp`. Let me fix it and run the test again:

```C
uint8_t multiply (uint8_t a, uint8_t b){
	return 2;
}
``` 

**What, can't I do that?** Why not? All the tests are passing now! Everything is good, check it out:

```
Running test_runner
.
OK (1 tests, 1 ran, 1 checks, 0 ignored, 0 filtered out, 0 ms)
```


Now it's time to add more tests, so I'm obligated to code for real:

```C
TEST(multiply_funtion, two_positives){
	CHECK_EQUAL( 2, multiply(  1, 2));
	CHECK_EQUAL(18, multiply(  3, 6));
	CHECK_EQUAL( 0, multiply(  0, 3));
	CHECK_EQUAL( 0, multiply(100, 0));
}
``` 

Then the test fails again:
```
bugfree_robot/test/multiply_test.cpp:12: error: Failure in TEST(multiply_funtion, two_positives)
	expected <18>
	but was  <2>
	difference starts at position 0 at: <          2         >
	                                               ^
.
Errors (1 failures, 1 tests, 1 ran, 4 checks, 0 ignored, 0 filtered out, 1 ms)
```

Than can be fixed with the code anyone would insert just in the beginning:, and the tests will pass again. 
```C
uint8_t multiply (uint8_t a, uint8_t b){
	return a*b;
}
``` 

```
Running test_runner
.
OK (1 tests, 1 ran, 4 checks, 0 ignored, 0 filtered out, 0 ms)
```

Remember the request about positive and negative inputs? It's time to test it. The `two_positives` test will be kept as last shown and another one will be created now.


```C
TEST(multiply_funtion, two_negatives){
	CHECK_EQUAL( 15, multiply(-5, -3));
}
``` 

Now the test won't even compile, because Cpputest compiles by default with many source code error checks that will scream messages like this:

```
bugfree_robot/test/multiply_test.cpp: In member function ‘virtual void TEST_multiply_funtion_two_negatives_Test::testBody()’:
bugfree_robot/test/multiply_test.cpp:16:28: error: unsigned conversion from ‘int’ to ‘uint8_t’ {aka ‘unsigned char’} changes value from ‘-5’ to ‘251’ [-Werror=sign-conversion]
  CHECK_EQUAL( 15, multiply(-5,-3));
  ```

Remember the function signature was defined with two `uint8` variables as parameters? Those are unsigned and don't allow negative values. It mus get fixed before continuing:

```C
uint8_t multiply (int8_t a, int8_t b){
	return a*b;
}
``` 

The best part is that this test is already passing right now and two tests will be added:

```C
TEST(multiply_funtion, opposite_signs){
	CHECK_EQUAL(-20, multiply(-10,  2));
	CHECK_EQUAL(-30, multiply( 10, -2));
}
``` 

And those who came back to give another check on the function signature are probably expecting this error message, since the function returns an unsigned value too:

```
bugfree_robot/test/multiply_test.cpp:20: error: Failure in TEST(multiply_funtion, opposite_signs)
	expected <-20>
	but was  <236>
	difference starts at position 0 at: <          236       >
	                                               ^
...
Errors (1 failures, 3 tests, 3 ran, 6 checks, 0 ignored, 0 filtered out, 0 ms)

```

And the simple fix is done by changing the return type:
```C
int8_t multiply (int8_t a, int8_t b){
	return a*b;
}
``` 

It is traditional to test if the behavior is kept correct at maximum/minimum parameter values:
```C
TEST(multiply_funtion, max_min_values){
	CHECK_EQUAL( 16129, multiply( 127,  127));
	CHECK_EQUAL( 16384, multiply(-128, -128));
	CHECK_EQUAL(-16256, multiply( 127, -128));
}
``` 

That fails with:
```
bugfree_robot/test/multiply_test.cpp:24: error: Failure in TEST(multiply_funtion, max_min_values)
	expected <16129>
	but was  <1>
	difference starts at position 1 at: <         1          >
	                                               ^
....
Errors (1 failures, 4 tests, 4 ran, 7 checks, 0 ignored, 0 filtered out, 0 ms)
```

An 8bit return value is not able to hold the multiplication of two 8bit values. It must be increased to 16bits:
```
int16_t multiply (int8_t a, int8_t b){
	return (int16_t)(a*b);
}
```

Then so all tests will pass and we have a fully tested multiplication function. 
```
Running test_runner
....
OK (4 tests, 4 ran, 9 checks, 0 ignored, 0 filtered out, 0 ms)
```

----


I've committed the project to GitHub with this source code and the Cpputest framework. No need to hurry on checking that since the next post will be about creating the project folders structure and other environment configs to build it. Click on the next link to find it in the correct commit: [bugfree-robot/added cpputest and multiply library](https://github.com/matheusmbar/bugfree_robot/tree/b3b89a6c27d8607911186ba315695d4ed045edce)

Those who do open the repository will see that some details in the source code were omitted here and I'm going to talk about them later too. 