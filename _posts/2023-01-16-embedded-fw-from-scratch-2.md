---
layout: post
title: embedded firmware from scratch - part 2
categories: [tools]
tags: [embedded, programming, C++, toolchain, make]
comments: true
footnote: ""
---

This is the second article of an endeavor to develop an embedded software project for ARM microcontrollers that works standalone. It won't require any vendor specific tools in its development cycle. Take a look at [PART 1]({{ site.baseurl }}{% post_url 2022-10-23-embedded-fw-from-scratch-1 %}) to understand the beginning of this and the main pain points that I see when depending on IDE projects for firmware development.

At this point you may be thinking:
>"Yet another ARM embedded tutorial..."

And... yes, but also no. There are multiple steps, configurations and tools that must work together in order to build a functional firmware. Always remember that **nothing comes for free** when building projects from scratch. There is for sure a lot of information about each one of these tiny subjects scattered in multiple articles in the internet. Although many of them focus on one part and assume that you'll be able to figure out (or already know) all the other dependencies.

This won't be a deep dive in each tiny detail, since it would be an endless series of multiple articles. The intention here is documenting the minimum required to get a basic working firmware, explained in a way that I've wanted to find some time ago.

<!--more-->

This simple firmware must meet a few requirements:
- languages: C++ and C
- builds simply by running `make`
- runs on STM32F103F
- initializes global variables
- supports multiple source files
- supports printf and dynamic memory allocation

# Required tools

## Toolchain

Embedded firmware is usually built with a cross compiler, that runs in one platform (x86 ou and is able to create executable code for a different platform. The regular `gcc` compiler won't make it here, since it only builds for the host platform. The objective here is building for ARM microcontrollers, so the [ARM GNU Toolchain](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads) is the way to go. It includes a few executables and libraries that will be required in this process.

After installing, make sure it is binaries are available in you system by running a test command. On a Linux system, this is a good test:

```console
$ arm-none-eabi-gcc -v
COLLECT_GCC=arm-none-eabi-gcc
COLLECT_LTO_WRAPPER=/media/arm-none-eabi/12.2.0/lto-wrapper
Target: arm-none-eabi
Configured with: --target=arm-none-eabi --enable-languages=c,c++,fortran --with-newlib --with-gnu-as --with-gnu-ld
Thread model: single
Supported LTO compression algorithms: zlib
gcc version 12.2.0 (Arm GNU Toolchain 12.2.MPACBTI-Bet1 (Build arm-12-mpacbti.16))
```

It shows a lot of information (this is a reduced result) about the toolchain and some of the parameters used when it was built. Check your system's `$PATH` if it does not work, it must include a reference to where the toolchain is installed.

## Build automation

It is possible to compile everything manually in the terminal, but please don't do that. A build automation tool will help a lot in this matter, following a build recipe with the parameters and steps required for building the firmware. [GNU Make](https://www.gnu.org/software/make/) is more than capable of dealing with this. Its recipe is the `Makefile`, that will get a dedicated section here. Make sure that it is available in your system by running:

```console
$ make -v
GNU Make 4.3
Built for x86_64-pc-linux-gnu
Copyright (C) 1988-2020 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
```

It's usually easily installable by a package with the same name.

## Project repository

All the code that will be shown and described here is available at the repository [matheusmbar/embedded_cpp](https://github.com/matheusmbar/embedded_cpp). I recommend cloning it at [tag 0.1.0](https://github.com/matheusmbar/embedded_cpp/tree/0.1.0) if you want to follow along.

```console
$ git clone --branch 0.1.0 https://github.com/matheusmbar/embedded_cpp

$ tree embedded_cpp
embedded_cpp
├── blue_pill_01
│   ├── include
│   │   ├── main.h
│   │   ├── test_c.h
│   │   └── test_cpp.h
│   ├── Makefile
│   ├── src
│   │   ├── main.cpp
│   │   ├── sys
│   │   │   ├── startup.c
│   │   │   ├── syscalls.c
│   │   │   └── sysmem.c
│   │   ├── test_c.c
│   │   └── test_cpp.cpp
│   └── STM32F103C8TX.ld
└── LICENSE
```

There is not much there and all files with names starting with `test_` and the `main.h` are optional. There are actually only six files that put this firmware together.

>There are a few minor differences between the code presented here and what is present in the repository.
>They improve readability for this article and don't change the main behavior.


# Recipe for building firmware

## Makefile crash course

It is basically a cooking recipe, starting with the list of ingredients, a few  *mise en place* steps, the cooking process and then some plating to present all files in a beautiful and useful way.

For me the `Makefile` is similar to shell script, with variables and functions (that are called 'rules'). The tricky part is that the rules do not look like functions at first. Let's create a basic "Hello world" to show this.

```makefile
# Makefile
MESSAGE  = Hello
MESSAGE += world

test: hello.txt file.txt
	@echo "I'm rule '$@' with prerequisites: '$^'"
	@echo "The first prerequisite is '$<'"
	@echo Message:  $(MESSAGE)
	@echo $(MESSAGE) >> hello.txt

hello.txt:
	@echo "I create '$@'"
	@echo "Create the file" > hello.txt

file.txt:
	@echo "I don't create 'file.txt'"
```

There is a variable `MESSAGE` that receives a string and has another string appended in the next line. A space is implicitly included between the words, so it is actually a list of strings.

Then there is the first rule (I see it as a function, but let's use the correct name from now on) that **provides target** `test` and **requires two input files**: `hello.txt` and `file.txt`. It will check if the required files exist **before** running the rule. It will try to **find a rule** that lists the each of the absent files as a target and try to run it.

There is a rule with target `hello.txt` that creates file `hello.txt`. And another rule with target `file.txt` that only prints a message.

There are many [automatic variables](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html) available. I've use a few for this demonstration:
- `$@`: name of the target
- `$<`: the first prerequisite
- `$^`: all prerequisites

Create a file named `Makefile` with this content, save it in a directory and run `make` in the terminal. This will be the result of two consecutive executions:

```console
$ make
I create 'hello.txt'
I don't create 'file.txt'
I'm rule 'test' with prerequisites: 'hello.txt file.txt'
The first prerequisite is 'hello.txt'
Message: Hello world
$ make
I don't create 'file.txt'
I'm rule 'test' with prerequisites: 'hello.txt file.txt'
The first prerequisite is 'hello.txt'
Message: Hello world
$ cat hello.txt
Create the file
Hello world
Hello world
```

The log messages make it easy to follow what is happening:
- `test` is the first one when the file is evaluated, calling `make` without parameters will try to run it.
- `hello.txt` runs only once since the file exists in the second execution, it will run again only if this file is deleted.
- `file.txt` always runs because it's target is required for `test` and never gets created.

A rule **won't run** if all of its targets already exists and none of its inputs have changed.

Remember to pay attention to the indentation. Lines that begin with a TAB are assumed to be part of a rule and lines that do not begin with a TAB cannot be part or a rule.

This explanation covers most of the `Makefile` created for this project. It uses a few simple commands like adding a prefix to each entry in a variable, text substitution and commands to create/remove folders and files.

## Ingredients

This simple implementation requires an user provided list of source files. It is possible use the `find` command to create this list automatically, but it will do for now.

There is no need to list each head file explicitly, only the path to the include folders that will be available for `#include` directives.

The linker file completes the ingredients list.

```make
INCLUDES  = -I include
SRC_FILES = src/main.cpp \
            src/sys/syscalls.c \
            src/sys/startup.c \
            src/sys/sysmem.c \
            src/test_c.c \
            src/test_cpp.cpp
LINKER_FILE = STM32F103C8TX.ld
```

The final objective when building this embedded project is a `.elf` or a `.bin` file to program in the microcontroller. There a a few steps to create the `.elf` file:
- create a folder to put all build files (optional, but highly recommended)
- compile each C and C++ source files, creating object files (`.o`)
- link all object files and libraries

The next lines set a few variables that list these files.

```makefile
PROJECT_NAME = blue_pill_01
BUILDDIR     = build

# Create Object files (.o) list from SRC_FILES list
OBJ_FILES    := $(SRC_FILES:.c=.o)
OBJ_FILES    := $(OBJ_FILES:.cpp=.o)
OBJ_FILES    := $(addprefix $(BUILDDIR)/, $(OBJ_FILES))

# Binary filenames
ELF_FILENAME := $(BUILDDIR)/$(PROJECT_NAME).elf
BIN_FILENAME := $(BUILDDIR)/$(PROJECT_NAME).bin
```

This is the content of these variables:

```console
$ make echo
[...]
SRC_FILES: src/main.cpp src/sys/syscalls.c src/sys/startup.c
           src/sys/sysmem.c src/test_c.c src/test_cpp.cpp
OBJ_FILES: build/src/main.o build/src/sys/syscalls.o build/src/sys/startup.o
           build/src/sys/sysmem.o build/src/test_c.o build/src/test_cpp.o
ELF_FILENAME: build/blue_pill_01.elf
BIN_FILENAME: build/blue_pill_01.bin
```

PS: `make echo` is a custom rule that I've added to help on evaluating some variables. It's only a bunch of prints.


## Build flags

Build flags are a special requirement for compiling embedded firmware. Cross compiling requires telling the compiler some information about the target you are building for, where is the linker file, some information about the libraries to use and more common parameters like optimizations and debug settings.

Getting information about the ARM processor present in the target microcontroller is crucial here. There is an extensive documentation about the `-m` options at this [ARM Options](https://gcc.gnu.org/onlinedocs/gcc/ARM-Options.html) page. Evaluate the microcontroller's documentation to find the details its processor and help on setting the required build flags. I find it useful checking open source projects (e.g. [libopencm3](https://github.com/libopencm3/libopencm3)) that support multiple cores in order to get some start point and validation on these parameters.

The variable names for the build flags are following the GNU Make standard. This is a brief description since the naming convention is confusing:
- CPPFLAGS : used by C/C++ PreProcessors
- CFLAGS   : used by C compiler
- CXXFLAGS : used by C++ compiler
- LDFLAGS  : set up the path of library files


I've added comments for each section of variables. They'll be referenced in the build rules.

```makefile
# Include folders
CPPFLAGS += $(INCLUDES)

# Set build flags for Cortex M3 core
CPPFLAGS += -mcpu=cortex-m3 -mthumb -msoft-float

# Build for debug
CPPFLAGS += -g

# Use newlib nano, optimized to embedded
CPPFLAGS += --specs=nosys.specs
CPPFLAGS += --specs=nano.specs

# Disable exceptions
CXXFLAGS += -fno-exceptions

# Linker file path
LDFLAGS  += -T $(LINKER_FILE)

# Remove unused code
CPPFLAGS += -ffunction-sections -fdata-sections
LDFLAGS  += -Wl,--gc-sections
```

## Build steps

These build steps are based on the GNU Make [catalog of rules](https://www.gnu.org/software/make/manual/html_node/Catalogue-of-Rules.html). A lot of rules are provided by the software and there is no need to override them if all the variables are set as it expects. I've decided to explicit them here for two main reasons:
- show the build steps clearly
- put all build outputs inside the `BUILDDIR` (without using `VPATH`)

```makefile
# Set build software
CROSS_COMPILE  = arm-none-eabi
CC            := $(CROSS_COMPILE)-gcc
CXX           := $(CROSS_COMPILE)-g++
```

These two rules build `.c` and `.cpp` files respectively. They are chosen based on which file exists for a required `.o` file, indicated by the prerequisite extension for each one. The `%` allows matching file names and paths on target and prerequisites. The exact filenames that are used by these rules are "recovered" with automatic variables.

```makefile
# Compile C files
$(BUILDDIR)/%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -o $@ -c $<

# Compile CPP files
$(BUILDDIR)/%.o: %.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -o $@ -c $<
```

This is the final compile step. It requires all object files and:
- creates the `.elf` file
- exports a `.bin` file
- prints some size information about the final binary

```makefile
# Link and create final binary
$(ELF_FILENAME): $(OBJ_FILES)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(LDFLAGS) $(OBJ_FILES) -o $@
	$(CROSS_COMPILE)-objcopy -O binary $(ELF_FILENAME) $(BIN_FILENAME)
	$(CROSS_COMPILE)-size $(ELF_FILENAME)
```

All this allows building the firmware by running a single command in the project folder, as long as the [Required Tools](#required-tools) are working correctly.

```console
$ cd embedded_cpp/blue_pill_01
$ make
$ tree build
build
├── blue_pill_01.bin
├── blue_pill_01.elf
└── src
    ├── main.o
    ├── sys
    │   ├── startup.o
    │   ├── syscalls.o
    │   └── sysmem.o
    ├── test_c.o
    └── test_cpp.o
```

There are two complementary and self explanatory rules:

```make
clean:
	$(RM) $(OBJ_FILES)
	$(RM) $(ELF_FILENAME) $(BIN_FILENAME)

echo:
	@echo LDFLAGS:  $(LDFLAGS)
	@echo CFLAGS:   $(CFLAGS)
	@echo CPPFLAGS: $(CPPFLAGS)
	@echo CXXFLAGS: $(CXXFLAGS)
	@echo ""
	@echo SRC_FILES:     $(SRC_FILES)
	@echo OBJ_FILES:     $(OBJ_FILES)
	@echo ELF_FILENAME:  $(ELF_FILENAME)
	@echo BIN_FILENAME:  $(BIN_FILENAME)
```

# Conclusion

This finishes the ingredients list and build steps for compiling the firmware. It may seem like a lot at first sight, but it will not require much change as the project gets new files and there are ways to make things simpler later as well.

The next article will cover the Linker File and initialization code required to run the firmware correctly in the target.