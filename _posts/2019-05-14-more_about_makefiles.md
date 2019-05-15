---
layout: post
title: a bit more about makefiles
categories: [bugfree-robot]
tags: [TDD, embedded, programming]
comments: true
footnote: Makefile options can make a lot
---


The Makefile created for the project in the last article is simple but the `$(CPPUTEST_HOME)/build/MakefileWorker.mk` included at the end provides a lot of useful tools. They can help checking how the tests are built and executed. These tools are called as parameters to the `make` command on terminal and will trigger specific actions detailed on the Makefile that often won't build and run the tests but execute something else. 

The available options are listed typing `make ` in the terminal and pressing `TAB` twice. This will trigger the auto-complete command in you terminal and list some options. For me it shows these ones:

```
$ make 
all           clean         format        objs/         start         test_runner   
all_no_tests  debug         gcov          realclean     test          vtest         
check_paths   flags         lib/          run           test-deps 
```

I will describe how to and when to use some of those. 

<!--more-->

### `make all`
Executing `make` is the same as calling `make all`. It will compile everything that is listed in the project Makefile (libraries and tests), call the linker, create the test binary and execute it. It is the most used one since it does everything you usually need while developing.

### `make all_no_tests`
This one will compile everything but the test files and won't build the test binary neither execute it for obvious reasons. It can help in a bigger project where the tests take much time to build/execute and at some moment of the development cycle the need is checking if the libraries are building. 

### `make vtest`
It will execute as `make all` but listing each individual test that is executed and how long it takes to execute. It is one of my favorites as sometimes I include temporary print functions to help debugging so it is easy to check what is printing inside each test.
This is the output for the `bugfree-robot` at current stage:

```
Running test_runner
TEST(multiply_funtion, max_min_values) - 0 ms
TEST(multiply_funtion, opposite_signs) - 0 ms
TEST(multiply_funtion, two_negatives) - 0 ms
TEST(multiply_funtion, two_positives) - 0 ms
TEST(dummy_test, pass_me) - 0 ms

OK (5 tests, 5 ran, 10 checks, 0 ignored, 0 filtered out, 0 ms)
```

A `printf("\nExited function 1\n")` called inside test "opposite_signs" will result in this:
```
Running test_runner
TEST(multiply_funtion, max_min_values) - 0 ms
TEST(multiply_funtion, opposite_signs) - 0 ms
Exited function 1

TEST(multiply_funtion, two_negatives) - 0 ms
TEST(multiply_funtion, two_positives) - 0 ms
TEST(dummy_test, pass_me) - 0 ms

OK (5 tests, 5 ran, 10 checks, 0 ignored, 0 filtered out, 0 ms)
```


### `make clean`
This one is pretty familiar for developers and will delete most of the files created during the build process. It is that friend you remember to call when the build or the tests are failing and you don't know why anymore :sweat_smile: 

### `make realclean`
Almost the same as the one above but it will delete files that are in the compiling folders but are not listed as files created by the Makefile anymore. It will delete a file that was compiled before through the Makefile but is not anymore listed for it to build, `make clean` will keep these files. I recommend executing it sometimes to make sure that no old previously compiled files are being used in the tests and helping them to fail/success.  It is almost mandatory when changes are made on the paths on the Makefile.

### `make debug`
It is intended to be used while looking for errors on building and running the tests and libraries. It will provide a long list of all the file paths that are considered by the Makefile. The shown classes are:

 - Target Source files
 - Target Object files
 - Test Source files
 - Test Object files
 - Mock Source files
 - Mock Object files
 - All Input Dependency files
 - Stuff to clean
 - Includes
Remember to execute it if the linker is falling or some tests are not failing when they should. It will help debugging the Makefile


### `make flags`
It is complementary to `make debug` but focused in the build process. It provides a list of flags used when calling `gcc` and `g++` when the libraries and tests are built and linked. I intent to write an article about these flags since they can help on coding at higher standards. The flags categories are:

 - Compile C and C++ source with CPPFLAGS
 - Compile C++ source with CXXFLAGS
 - Compile C source with CFLAGS
 - Link with LDFLAGS
 - Link with LD_LIBRARIES
 - Create libraries with ARFLAGS

### `make gcov`
It will trigger code coverage verification and print the summary. It requires some additional configuration and provides some nice statistics about code sections that are not tested. 

### `make check_paths`
It is possible to develop your own commands too and this is the one that I've made. It is coded in the project's Makefile as this:

```
.PHONY: check_paths
check_paths:
        @echo "\nRepository dir\t" $(REPOSITORY_DIR)
        @echo "\nTest dir\t" $(TEST_DIR)
        @echo "\nMakefile dir\t" $(MAKEFILE_DIR)
        @echo "\nProject dir\t" $(PROJECT_DIR)
        @echo "\nSrc dir  \t" $(SRC_DIR)
        @echo "\nSrc dirs  \t" $(SRC_DIRS)
        @echo "\nInclude dirs  \t" $(INCLUDE_DIRS)
        @echo "\nCpputest home  \t" $(CPPUTEST_HOME)
```

It is intended to help checking the paths set in the Makefile. It will print all of them fully expanded and show clear if some path is missing a slash or not solving symbols correctly. This is the output for now:

```
$ make check_paths

Repository dir  

Test dir     /home/matheus/bugfree_robot/test

Makefile dir     /home/matheus/bugfree_robot/test/

Project dir  /home/matheus/bugfree_robot

Src dir     

Src dirs     /home/matheus/bugfree_robot

Include dirs     /home/matheus/bugfree_robot /home/matheus/bugfree_robot/test/cpputest/include

Cpputest home    /home/matheus/bugfree_robot/test/cpputest
```

There are the make commands that I recommend testing and getting used to while developing with TDD. They can accelerate debugging and creating automatic tasks that suit your project. The Makefile language seems similar to `bash` but it is not always like that, it takes some time to get used to it (I didn't get there yet). 