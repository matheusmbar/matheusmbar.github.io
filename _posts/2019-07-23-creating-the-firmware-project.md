---
layout: post
title: creating the firmware project
categories: [bugfree-robot]
tags: [embedded, hardware]
comments: true
footnote: I can already see the LED blinking in the end of the tunnel!
---

Now that TDD and the hardware got explained we are allowed to start creating the firmware project and the first library. It couldn't go other way than a library that will allow to blink LEDs, the traditional `hello world` for embedded firmware. It may sound crazy but no LEDs will be required for this tests neither any microcontroller. 

The mock library will be included to simulate the calls to the HAL (Hardware Abstraction Layer) that usually interacts with the microcontroller peripherals. This is a powerful resource that allows building, executing and testing functions that are in the lower levels of the firmware architecture and wouldn't run outside the target device. 

The Cpputest repository comes with the Cppumock framework and provides special configurations to inform which source codes are included just as mocks for other source codes. The mock's function is to provide a way to monitor how the code under test is interacting with other libraries, capturing information about which functions got called, which parameters were provided to them and choose the return values for each call.

<!--more-->

### Reasons for an IO library

I always prefer to implement an IO driver library in my embedded firmware to simplify the function calls in the rest of the code besides avoiding typos due to excessive typing repetition required in HAL function parameters. The function call to blink an IO pin in a STM32 microcontroller goes like this:

```c
HAL_GPIO_WritePin (LED1_GPIO_Port, LED1_GPIO_Pin, GPIO_PIN_SET);
HAL_GPIO_WritePin (LED1_GPIO_Port, LED1_GPIO_Pin, GPIO_PIN_RESET);
```

This big call requires a lot of typing and attention to avoid mixing the Port and the Pin or accepting the wrong auto-complete suggestions with LED2 or LED3 values. It will require that any library that deals with IO pins to include the HAL GPIO library and be set to platform specific. The IO Library will allow the creation of dedicated functions to set pin high, set pin low, check if low, check if high and keep the other libraries platform independent since all the code that is platform dependent is encapsulated inside the IO Library. 

The above call is replaced by:

```c
IO_setHigh(IO_LED1);
IO_setLow (IO_LED1);
```

Starting all the functions with a word that relates to the library is a personal preference and allows a faster and easier use of the IDE auto-complete helper.

We will implement these functions for now:
- set HIGH
- set LOW
- read level

### Creating the `ioc` project and code

Configuring the IO pins as INPUT/OUTPUT will be left out of this library (at least until changing this configuration is required in runtime) since the auto-generated code from STM32Cube will take care of this task based in the configurations set in the project `ioc` configuration file. 

Creating the firmware project is the next step by the way. It will be done through the pretty new **STM32Cube IDE** that integrates the STM32Cube MX and the now obsolete TrueStudio. I won't get too much in detail in this section since the interface is pretty self-explanatory. The basic steps are:
- create a new STM32 project
- select the correct microcontroller
- set project name and location
- configure a few pins as GPIO_Output and give some nice names to them
- enable **Generate peripheral initialization as a pair of '.c/.h' files per peripheral** in Project Manager > Code Generator. It keeps the `main.c` simpler by moving each peripheral initialization code to separate files
- Save the file (apparently CTRL+C is not working in this perspective so hit SAVE in the menus)
- Say YES to the "generate code" question

There are many other parameters to set for a full working firmware like clock frequency, interrupts and other peripherals but they won't matter for now. Take some time to analyze what is required for your project and add the required parts along the way.

Say hello to a bunch of code that you won't have to code and many drivers that STM has provided to you. Take a look at the generated source code if this is your first time using this tool in order to learn what is already present there. There are low level libraries for all the hardware peripherals that were enabled earlier, clock initialization instructions, pins and ports definitions and a lot of stuff required for a microcontroller to start running. I've seen the software miss to generate code like interrupt handlers, so remember to study the peripherals a bit deeper and check if everything required is there when something is misbehaving. 

### Creating the IO Library

This a great time to define the folder structure that will hold the firmware source and header files since changing this later on results in a lot of work. The STM32 code generator creates 3 main folders (`Src`, `Inc` and `Drivers`) that will hold any auto generated code. 

For this project I'm choosing to create a new folder at this same level called `bugfree` since, of course, any code inside it will be fully tested and free of bugs :wink:. This folder will hold both source and header files since it gets easier to work keeping both files for each library in the same folder.

The folder tree will look like this after adding some sub-folders for the io library and creating its empty source and header files:

```
├── bugfree
│   └── drivers
│       └── io
│           ├── io.c
│           └── io.h
├── Drivers
├── Inc
├── Src
├── Startup
└── test
```

[This commit](https://github.com/matheusmbar/bugfree_robot/tree/6f39656fa68d0bb7b099850bbc4e84507f224a6f) shows the full project at this stage, check it to see the complete list of files and folders that were hidden for clarity here. 

In the next step there will be LEDs blinking! At least mock LEDs :sweat_smile:
