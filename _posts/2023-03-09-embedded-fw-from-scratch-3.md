---
layout: post
title: embedded firmware from scratch - part 3
categories: [tools]
tags: [embedded, programming, C++, toolchain, make]
comments: true
footnote: ""
---

This is the third article about setting up a project to build code for ARM microcontrollers from scratch. Take a look at [PART 1]({{ site.baseurl }}{% post_url 2022-10-23-embedded-fw-from-scratch-1 %}) and [PART 2]({{ site.baseurl }}{% post_url 2023-01-16-embedded-fw-from-scratch-2 %}) if you haven't read them.

This one is dedicated for a few crucial steps for embedded development that are usually ignored when coding to run on operating systems like Linux (the toolchain will probably take care of it correctly). I'm talking about **startup code** and the **Linker File**. They will provide the very first instructions that execute when the processor starts and tell the linker where to put the binary bits that the compiler it is creating, every function and most of the variables will get an address in memory base on this.

<!--more-->

Knowledge about program memory segments will be a requirement for this one. Take a moment to read about `data`, `text` and `bss` in [this article](https://mcuoneclipse.com/2013/04/14/text-data-and-bss-code-and-data-size-explained/) or at [Wikipedia](https://en.wikipedia.org/wiki/Data_segment) if not so confident about their definitions.

# Linker file

## Basics

It seems better to start this one talking about the Linker File (as known as Linker Script). I'll not pretend to understand everything that it is doing, there is a lot of sections, variables and special keywords. This is the reason that this one was not developed from scratch, but imported from a project created with STM32CubeIDE for this target, with only a few small adjusts. not all sections will be described here, only the main ones and what gets referenced in the startup code. Open the [STM32F103C8Tx.ld](https://github.com/matheusmbar/embedded_cpp/blob/0.1.0/blue_pill_01/STM32F103C8TX.ld) file to follow along.

There is a detailed section about Linker Scripts on [Red Hat Enterprise Linux 3: Using ld, the Gnu Linker](https://web.mit.edu/rhel-doc/3/rhel-ld-en-3/scripts.html), including this definition:

> The main purpose of the linker script is to describe how the sections in the input files should be mapped into the output file, and to control the memory layout of the output file.

The input files for the linking stage are the object files (`.o`) created by compiling C and C++ files in the project and its libraries. The output file for us is a binary `.elf` or `.bin` to program in the target.

## Memory layout

The main memory layout is completely dependent on the target platform. Every start address, length, some special section locations will require information from its documentation to setup correctly. The **Memory Model** section is probably the best reference for this.

The main memory division is between FLASH and RAM. They get listed in the beginning of the file like this:

```
MEMORY
{
  RAM     (xrw)    : ORIGIN = 0x20000000,  LENGTH = 20K
  FLASH    (rx)    : ORIGIN = 0x8000000,   LENGTH = 64K
}
```

The linker does not care about the name of the sections, a RAM section does not help it allocate mutable variables there (even though it seems obvious for developers). Only the parameters that you provide about the sections matter.

This script snippet indicates that FLASH section starts at address 0x8000000 and extends for 64 KB, this section allows only read and execution (`rx`). RAM starts at address 0x20000000 and extends for 20KB, it is allowed to read, write and execute (`xrw`) on this section. Executing from RAM is not required (or too common), but it may be useful for some tasks. Some projects may want to split the memory in more sections, like dedicating a region for bootloader instructions, support for this is platform dependent.

This is a good start, the linker will identify some NO GOs, but it is only the start.

## FLASH memory sections










```ld
ENTRY(Reset_Handler)
```

//


It works

he Linker Script is a text file made up of a series of Linker directives which tell the Linker where the available memory is and how it should be used. Thus, they reflect exactly the memory resources and memory map of the target microcontroller.



# Startup code



# Heap memory allocation




Challenges:
- initial values of uninitialized variables (it is nice to set them as zero)
- variable initialization
- objects (constructors)
- printf (stdio)
- test code
- libraries


## Code

## Linker file

## `Makefile`

## Test codes


### Global variables and objects on C++ files

### Global variables on C files

### Stdio and `printf`



# ADD LINKS to learning sources !!!