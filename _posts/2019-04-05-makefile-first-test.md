---
layout: post
title: create makefile and first test
categories: [bugfree-robot]
tags: [TDD, embedded, programming,code]
comments: true
footnote: Absolute paths make a versatile Makefile
---

The next step on this process is creating a Makefile and the first test source code. The Makefile is something that many developers never took some time to learn about and create, myself included until some time ago. It is a really powerful tool that I even dare to describe as: *limitless*. 

While building our test project it will execute these functions:
- define build flags and tools
- define source codes and includes
- compile all source files in the project
- compile all the test sources
- link all the files following its includes and dependencies
- link the Cpputest binary and libraries to built test files
- create the final test application
- execute the test application
- print the test result

<!--more-->

At first sight it looks like a lot of work to set a Makefile that will trigger so many actions but Cpputest helps on simplifying this process as much as possible. It provides a helper Makefile (found on `cpputest/build/MakefileWorker.mk`) that executes all the hard job. The project test makefile only needs to define some variables required by `MakefileWorker.mk` and tells where it will find the source and include files, some other paths and build flags. 

Our test Makefile will be created inside the `test` folder, and named as: `Makefile` (not much space for creativity, its the required name). The `MakefileWorker.mk` has a very detailed comment section on its header that explains each parameter meaning that I strongly recommend reading. I'll show a part of it here:

```make
# INCLUDE_DIRS - Directories used to search for include files.
#                 This generates a -I for each directory
# SRC_DIRS - Directories containing source files to build into the library
# SRC_FILES - Specific source files to build into library. Helpful when not all code
#             in a directory can be built for test (hopefully a temporary situation)
# TEST_SRC_DIRS - Directories containing unit test code build into the unit test runner
#             These do not go in a library. They are explicitly included in the test runner
# TEST_SRC_FILES - Specific source files to build into the unit test runner
#             These do not go in a library. They are explicitly included in the test runner
# MOCKS_SRC_DIRS - Directories containing mock source files to build into the test runner
#             These do not go in a library. They are explicitly included in the test runner
# ------
#
# CPPUTEST_HOME - where CppUTest home dir found
```

I believe the variables listed above are the minimum required to compile a project with Cpputest framework. Let's start creating the Makefile for the `bugfree-robot`. 

It is recommended to provide absolute paths on these variables. The following line could be added to your Makefile:

```bash
CPPUTEST_HOME=/home/username/bugfree-robot/test/cpputest
```

BUT this is NOT recommended. Anyone else that clones this project, even you cloning it in somewhere else, will receive an infinite number of errors when trying to build the tests. Paths like this will make impossible to run automated tests on a Continuous Integration flow.

There is a way to use absolute paths that will get updated automatically when compiling the tests and it uses some helper variables in the process. I always start the test makefile with these lines:

```bash
MAKEFILE_DIR=$(dir $(realpath $(firstword $(MAKEFILE_LIST))))
PROJECT_DIR=$(realpath $(MAKEFILE_DIR)..)
TEST_DIR=$(PROJECT_DIR)/test
```

The first two lines use some one liner command line magic and makefile commands. Considering that the Makefile is in the folder `/home/username/bugfree-robot/test`, these variables will expand to:

```bash
MAKEFILE_DIR=/home/username/bugfree-robot/test
PROJECT_DIR=/home/username/bugfree-robot
TEST_DIR=/home/username/bugfree-robot/test
```
This will make sure that no matter where you clone this project these paths are set correctly and can be used to construct absolute paths on the next required variables. Don't forget that this structure expects that the Makefile is inside a `test` folder that is inside your project folder. Adjust these paths if your folders structure is different. 

Now we can set the other required variables:


```bash
CPPUTEST_HOME=$(TEST_DIR)/cpputest

# project source files path
SRC_DIRS=$(PROJECT_DIR)

# project header files path
INCLUDE_DIRS=$(PROJECT_DIR)

# add this to avoid problems when including cpputest headers on test files
INCLUDE_DIRS+=$(CPPUTEST_HOME)/include

## specify where the test code is located
TEST_SRC_DIRS=$(TEST_DIR)

## what to call the test binary
TEST_TARGET=test_runner
```

The last one is kinda optional but if you don't set it your test executable application will be called: `name_this_in_the_makefile_tests`. It is funny but a too big filename for me.

At this point our work is almost done, the last step is including the Cpputest helper makefile:

```bash
#run MakefileWorker.mk with the variables defined here
include $(CPPUTEST_HOME)/build/MakefileWorker.mk
```

At this point the Makefile is ready so get your terminal ready and go to the test directory. Execute the command: `make`. You will for sure get some error output, something ending like this:

```
/usr/bin/ld: /usr/lib/gcc/x86_64-linux-gnu/8/../../../x86_64-linux-gnu/Scrt1.o: in function `_start':
(.text+0x20): undefined reference to `main'
collect2: error: ld returned 1 exit status
make: *** [/home/username/bugfree_robot/test/cpputest/build/MakefileWorker.mk:486: test_runner] Error 1
```

The problem is: there is no `main ()` to execute in the end of build process. The next step is creating a `test/main.cpp` file that contains the `main()` function for out test application. It is short and won't require any further changes along the projects development. Its content will be:

```c
// test/main.cpp
#include "CppUTest/CommandLineTestRunner.h"

int main (int ac, char ** av){
    return CommandLineTestRunner::RunAllTests(ac,av);
}
```

Execute the `make` command again and expect to receive this result:

```
Running test_runner

OK (0 tests, 0 ran, 0 checks, 0 ignored, 0 filtered out, 0 ms)
```

:tada: :tada: :tada: :tada: 

This is the first successful CODE :arrow_right: MAKE :arrow_right: RUN TEST :arrow_right: PASS. 

Let's create a first file before wrapping up this post naming it as `test/dummy_test.cpp` with this content:

```c
#include "CppUTest/TestHarness.h"

// create a test group
TEST_GROUP(dummy_test){
   
};

//create a test for that test group
TEST (dummy_test, pass_me){
    CHECK_EQUAL(1,1);
}
```

The include will be present in every test source code, providing the Cpputest framework function calls and macros. 

Every `TEST` must belong to a `TEST_GROUP`. The `TEST_GROUP` will help to reduce code repetition for tests that require the same setup before execution and wrap up after execution, more on that later. 

Another `make` will result in a success with the following message:

```
Running test_runner
.
OK (1 tests, 1 ran, 1 checks, 0 ignored, 0 filtered out, 0 ms)
```

`CHECK_EQUAL` is the most simple and probably the most used test macro provided by Cpputest. Many other ones are defined on `cpputest/include/CppUTest/UtestMacros.h`. Some of them will be introduced as required later on.

Add another test just to see it fail and the world burn :fire: :

```c
TEST (dummy_test, fail_me){
    CHECK_EQUAL(1,0);
}
```

Resulting in:

```
Running test_runner

/home/username/bugfree_robot/test/dummy_test.cpp:13: error: Failure in TEST(dummy_test, fail_me)
    expected <1>
    but was  <0>
    difference starts at position 0 at: <          0         >
                                                   ^

..
Errors (1 failures, 2 tests, 2 ran, 2 checks, 0 ignored, 0 filtered out, 0 ms)

make: *** [/home/username/bugfree_robot/test/cpputest/build/MakefileWorker.mk:455: all] Error 1
```

That's it for this article. Now we have the first version of the Makefile (it will be extended a lot while the project is developed) and the first test source file. The test builds and returns the result. Take some time to remove the failing test and experiment with other tests.

PS: No dedicated commit at this point, but I've just commited the `dummy_test.cpp` and the `Makefile` at [this commit](https://github.com/matheusmbar/bugfree_robot/tree/d5bf31274186e49881a2dd85808058ba82abfbd1)
