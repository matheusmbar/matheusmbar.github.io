---
layout: post
title: embedded firmware from scratch - part 3
categories: [tools]
tags: [embedded, programming, C++, toolchain, make]
comments: true
footnote: "There is life before main()"
---

Which code does execute first when a microcontroller starts to run? Many would say:

> Firmware execution starts at the `main()` function

Eventhough that is a reasanoble and expected answer, a lot should have already happened when the execution gets there.

Let's take a look at a few crucial steps for embedded development that are usually ignored when coding for complete operating systems like Linux, where the toolchain will probably take care of everything correctly. I'm talking about **startup code** and the **linker script**. They will provide the very first instructions that execute when the processor starts and tell the linker where to put the binary bits that the compiler it is creating, every function and most of the variables will get an address in memory base on this.

This is the third article in a series about creating a firmware project from scratch. The other ones are available at [PART 1]({{ site.baseurl }}{% post_url 2022-10-23-embedded-fw-from-scratch-1 %}) and [PART 2]({{ site.baseurl }}{% post_url 2023-01-16-embedded-fw-from-scratch-2 %}).

<!--more-->

Knowledge about program memory segments will be a requirement for this one. Take a moment to read about `text`, `data` and `bss` in [this article](https://mcuoneclipse.com/2013/04/14/text-data-and-bss-code-and-data-size-explained/) and [Wikipedia](https://en.wikipedia.org/wiki/Data_segment) if not so confident about their definitions.

# Structuring the scratch

## Project repository

All the code that will be shown and described here is available at the repository [matheusmbar/embedded_cpp](https://github.com/matheusmbar/embedded_cpp). I recommend cloning it at [tag 0.1.0](https://github.com/matheusmbar/embedded_cpp/tree/0.1.0) if you want to follow along.

```console
$ git clone --branch 0.1.0 https://github.com/matheusmbar/embedded_cpp

$ tree embedded_cpp
embedded_cpp
└── blue_pill_01
    ├── include
    │   └── (...)
    ├── Makefile
    ├── src
    │   ├── main.cpp
    │   ├── sys
    │   │   ├── startup.c
    │   │   └── syscalls.c
    │   ├── test_c.c
    │   └── test_cpp.cpp
    └── STM32F103C8TX.ld
```

>I've hidden some files from the tree, showing only the ones that are required at this moment.
>There are a few minor differences between the code presented here and what is present in the repository.
>They improve readability for this article and don't change the main behavior.


## Linker script file

For a long time I've considered the linker script file part of the solution provided by the vendor's IDE, with not much need for a closer look at. Oppening it is actualy a bit scary, it seems like a combination of magic words grouped in some blocks.

It got impossible to ignore for this "firmware from scratch" project. The linker script may be understood as a basic sketch of the required firmware parts, evenmore for the startup process. I'll use it as a guide while going along the startup process, that will cover most of its content.

Its content and structure are tightly coupled to the microcontroller architecture and part number. It passes commands to the linker in the final steps of generating a binary file, with these main responsabilities:
- list which data will be part of the binary
- size of FLASH, RAM and other memory areas
- define sections to place data based on their types
- set symbols that indicate section locations and sizes
- where each type of data will be placed inside the binary

Mentions of "data" here include: initial values for variables, function pointers, custom code, library code, any result from the compilation process that may be required by the firmware. It is even possible to include data that is not even required anywhere, so optimizing binary size should include checking the linker script file.

I'll not pretend to understand everything that it is doing, there are a lot of sections, variables and special keywords. This is the reason that this one has not been developed from scratch, but imported from a project created with STM32CubeIDE for this target, with only a few small adjusts. not all sections will be described here, only the main ones and what gets referenced in the startup code. Open the [STM32F103C8Tx.ld](https://github.com/matheusmbar/embedded_cpp/blob/0.1.0/blue_pill_01/STM32F103C8TX.ld) file to follow along.

Many variable and section names are customizable and coupled to compiler toolchain, implementation in the startup and other low level firmware code, as will be shown in the next topics. While writing this, I've realized that some data sections described in the Linker Script are not in use by the startup code or not of much relevance at this moment and won't be covered.

Take a look at [LD Command Language](https://ftp.gnu.org/old-gnu/Manuals/ld-2.9.1/html_chapter/ld_3.html) for a detailed documentation of the language used in the linker script while reading the next sections.

## Header

The first line in my linker script is the ENTRY command, that indicates the entrypoint for the execution. This is the answer to "what gets executed first", a function defined with this name. This function will be detailed in next sections along the linker script.

The MEMORY command describes the memory layout, split in RAM and FLASH. This script snippet indicates that FLASH section starts at address 0x8000000 and extends for 64 KB, this section allows only read and execution (`rx`). RAM starts at address 0x20000000 and extends for 20KB, it is allowed to read, write and execute (`xrw`) on this section. Executing from RAM is not required (or too common), but it may be useful for some tasks. Some projects may want to split the memory in more sections, like dedicating a region for bootloader instructions, support for this is platform dependent.

```rs
ENTRY(Reset_Handler)

MEMORY
{
  RAM   (xrw) : ORIGIN = 0x20000000, LENGTH = 20K
  FLASH  (rx) : ORIGIN = 0x8000000,  LENGTH = 64K
}
```

The linker does not care about the name of the sections, a RAM section does not suggest it should allocate mutable variables there (even though it seems obvious for developers). Only the parameters that you provide about the sections matter.

The next three lines define variables that may be referenced in the linker script itself or by the C code in runtime.

```rs
_estack = ORIGIN(RAM) + LENGTH(RAM); /* end of "RAM" Ram type memory */
_Min_Heap_Size = 0x200;              /* required amount of heap */
_Min_Stack_Size = 0x400;             /* required amount of stack */
```

## Sections

The SECTIONS command is required in a linker script, specifying the output file's layout. This is well explained by `ld` documentation:

>The SECTIONS command controls exactly where input sections are placed into output sections, their order in the output file, and to which output sections they are allocated.
>You may use at most one SECTIONS command in a script file, but you can have as many statements within it as you wish. Statements within the SECTIONS command can do one of three things:
>
> - define the entry point;
> - assign a value to a symbol;
> - describe the placement of a named output section, and which input sections go into it.

Let's take a look at some of these sections, their contents and functions. Remember that all of them must be listed in a single SECTION command, this division is just for an easier understanding.

### .isr_vector

This is the first section definition that will be placed right at the start of the output file:

```rs
SECTIONS {
  .isr_vector : {        /* section name */
    . = ALIGN(4);        /* start location */
    KEEP(*(.isr_vector)) /* contents */
    . = ALIGN(4);        /* end location */
  } >FLASH               /* output section */
  /* ... */
}
```

It starts at a 4 bytes alignment, keeps all data declared for section `.isr_vector`, ends with a 4 bytes alignment and will be stored in FLASH memory.

For this project, a primitive ISR vector is the only content of this section, defined at `startup.c` with a special attribute:

```c
unsigned int *myvectors[4] __attribute__ ((section(".isr_vector"))) = {
    (unsigned int *) &_estack,
    (unsigned int *) Reset_Handler,
    (unsigned int *) nmi_handler,
    (unsigned int *) hardfault_handler
};
```

The microcontroller programming documentation describes what it expects to find in each position of the vector table. This structure provides the initial Stack Pointer value (`_estack`) and the reset handler function address to the Cortex-M4, so it is able to start execution after a reset event.

> WARNING:
>
> A complete ISR vector for this microcontroller should be a lot bigger, something around 75 entries. Triggering any peripheral interrupt at this firmware version is an undefined behavior since memory contents from the next section will be used as function pointers causing a crash at some point.
>
> The ISR vector will be the subject of another article.


### .text

This is the destination for most of the compiled and executable code. It is expected that checking the address of almost any function pointer will land on this section.

`.init` and `.fini` may hold pointers for two special functions, that operate as prologue and epilogue of the main function. The code that executes them will be shown in a bit.

```rs
SECTIONS {
  .text : {
    . = ALIGN(4);
    *(.text)         /* .text sections (code)  */
    *(.text*)        /* .text* sections (code) */
    KEEP (*(.init))  /* prologue function      */
    KEEP (*(.fini))  /* epilogue function      */
    . = ALIGN(4);
  } >FLASH
}
```

### .rodata

This section holds read-only data, such as `const static` variables.

```rs
SECTIONS {
  .rodata : {
    . = ALIGN(4);
    *(.rodata)    /* .rodata sections (constants, strings, etc.)  */
    *(.rodata*)   /* .rodata* sections (constants, strings, etc.) */
    . = ALIGN(4);
  } >FLASH
}
```

### .data

This section holds global initialized variables and their default values at startup. These values will be copied from FLASH to RAM by the reset handler function. The memory location description is a bit different for this one, indicating that whatever data ends in this section will actually ocupate space in both sections: RAM and FLASH.

```rs
SECTIONS {
  _sidata = LOADADDR(.data); /* symbol with .data address on FLASH */
  .data : {
    . = ALIGN(4);
    _sdata = .;        /* create a global symbol at data start */
    *(.data)           /* .data sections */
    *(.data*)          /* .data* sections */
    *(.RamFunc)        /* .RamFunc sections */
    *(.RamFunc*)       /* .RamFunc* sections */
    . = ALIGN(4);
    _edata = .;        /* define a global symbol at data end */
  } >RAM AT> FLASH
}
```

This is the first chance to take a look at the `Reset_Handler()`. A few symbols defined in the linker script are declared as `extern`, providing access for these values on runtime.

This code is responsible for copying data from FLASH to RAM. The data source starts at `_sidata` (pointer to text section) and the data destination starts at `_sdata` (pointer to data section), iterating up to `_edata` address.

```c
extern uint32_t _sdata;
extern uint32_t _edata;
extern uint32_t _sidata;

void Reset_Handler(void) {
    /* Copy init values from text to data */
    uint32_t *init_values_ptr = &_sidata;
    uint32_t *data_ptr = &_sdata;

    if (init_values_ptr != data_ptr) {
        for (; data_ptr < &_edata;) {
            *data_ptr++ = *init_values_ptr++;
        }
    }
    // [...]
}
```


### .bss

Any global variable that gets declared without an initial value is alocated here. This behavior provides support for setting a initial values for them if needed. This section takes space only on RAM.

```rs
SECTIONS {
  . = ALIGN(4);
  .bss : {
    _sbss = .;         /* define a global symbol at bss start */
    __bss_start__ = _sbss;
    *(.bss)
    *(.bss*)
    *(COMMON)
    . = ALIGN(4);
    _ebss = .;         /* define a global symbol at bss end */
    __bss_end__ = _ebss;
  } >RAM
}
```

There is another part of `Reset_Handler()` that iterates over all RAM address from `_sbss` up to `_ebss` writing '0' in all addresses.

```c
extern uint32_t _sbss;
extern uint32_t _ebss;

void Reset_Handler(void) {
    // [...]
    for (uint32_t *bss_ptr = &_sbss; bss_ptr < &_ebss;) {
        *bss_ptr++ = 0;
    }
    // [...]
}
```

### .{preinit,init,fini}_array

Sections `.preinit_array` and `.init_array` hold constructors for C++ globals and library objects ("libc" usualy) that must be initialized before `main()`. Section `.fini_array` does a similar function for constructors.

```rs
SECTIONS {
  .preinit_array : {
    . = ALIGN(4);
    PROVIDE_HIDDEN (__preinit_array_start = .);
    KEEP (*(.preinit_array*))
    PROVIDE_HIDDEN (__preinit_array_end = .);
    . = ALIGN(4);
  } >FLASH
  .init_array : { /* ... */ } >FLASH
  .fini_array : { /* ... */ } >FLASH
}
```
> `.init_array` and `.fini_array` section descriptions are hidden here since they are analogue to `.preinit _array`.

The execution of these constructors is not implemented in this code, since `newlib` provides a function that takes care of this initialization. This is the `Reset_Handler()` code related to it:

```c
void Reset_Handler(void) {
    // [...]
    __libc_init_array();
    int ret = main();
    exit(ret);
    // [...]
}
```

Pay attention to a call to our loved `main()` function  after the `__libc_init_array()`. Let's remember quickly all initialization that has happened before this:
- global variables with defined initial values
- zeroing non-initialized global variables
- global object constructors
- libc initialization

This is an implementation for `__libc_init_array()` available at [newlib/init.c](https://github.com/eblot/newlib/blob/master/newlib/libc/misc/init.c):

```c
void __libc_init_array (void) {
  size_t count;
  size_t i;

  count = __preinit_array_end - __preinit_array_start;
  for (i = 0; i < count; i++)
    __preinit_array_start[i] ();

  _init ();

  count = __init_array_end - __init_array_start;
  for (i = 0; i < count; i++)
    __init_array_start[i] ();
}
```

It uses symbols defined in the linker script as in the memory initialization code, calling functions from `preinit` first, then `_init()` (the prologue function) and `init`. There is a cleanup function available at [newlib/fini.c](https://github.com/eblot/newlib/blob/master/newlib/libc/misc/fini.c) as well, that will probably be called by the `exit(int)` function.


### ._user_heap_stack

This section executes a safety check for the amount of space available at RAM memory available after allocating the global variables, reserving some space for heap and stack allocation on runtime. Linker will throw an error if there is not enough space to allocate the required size.

This will be used at `sysmem.c` and will not be covered in detail right now.

```rs
SECTIONS {
  ._user_heap_stack : {
    . = ALIGN(8);
    PROVIDE ( end = . );
    PROVIDE ( _end = . );
    . = . + _Min_Heap_Size;
    . = . + _Min_Stack_Size;
    . = ALIGN(8);
  } >RAM
}
```

## Inspecting

ARM toolchain provides the `objdump` tool that shows a lot of information about a binary firmware file. There is a function to display the contents of the section headers, this is the result for the example firmware on this project:

```sh
$ arm-none-eabi-objdump blue_pill_01.elf -h

blue_pill_01.elf:     file format elf32-littlearm

Sections:
Idx Name          Size      VMA       LMA       File off  Algn
  0 .isr_vector   00000010  08000000  08000000  00010000  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  1 .text         0000151c  08000010  08000010  00010010  2**2
                  CONTENTS, ALLOC, LOAD, READONLY, CODE
  2 .rodata       00000098  0800152c  0800152c  0001152c  2**2
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  3 .preinit_array 00000000  080015c4  080015c4  00020064  2**0
                  CONTENTS, ALLOC, LOAD, DATA
  4 .init_array   00000008  080015c4  080015c4  000115c4  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  5 .fini_array   00000004  080015cc  080015cc  000115cc  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  6 .data         00000064  20000000  080015d0  00020000  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  7 .bss          00000178  20000064  08001634  00020064  2**2
                  ALLOC
```

# Closing points

These are the most important informations about the linker script and startup code, allowing a basic understanding about what is going on there. It is well know and repeated that "the devil is in the details" and there are so many of them in these commands and variables. Making a mistake while positioning some section, defining symbols and using them in the startup code may result in unbootable firmware that is hard to debug and understand.

I would not recommend writing the linker script and startup codes from scratch, there are other ways to obtain them from vendor or other automated tools.

The next version of this project will take a different approach to obtain these, less "from scratch" than here.

Take some time to look at the linker script in any of your own projects, their structure is usualy similar. Keep in mind that your mileage may vary, since some of them are cumbersome and hard to read due lack of line breaks and comments.

By the way, there is a great article from "Interrupt by Memfault" available [here](https://interrupt.memfault.com/blog/how-to-write-linker-scripts-for-firmware) that helped me a lot while studying this subject.
