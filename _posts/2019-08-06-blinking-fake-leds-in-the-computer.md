---
layout: post
title: blinking fake LEDs in the computer
categories: [bugfree-robot]
tags: [embedded, hardware]
comments: true
footnote: Blinking LEDs without LEDs!
---

The last step ended with the IO library source/header files created and the STM32Cube project created and able to cross compile for the microcontroller, although executing nothing but some peripheral initializations. The next step is adding some lines in the test Makefile telling it to compile the IO library and find some STM32 headers. This will allow the development of a test for this library and the HAL GPIO mock library.

<!--more-->

## Basic architecture

The next image shows a basic view of the firmware architecture around the IO Library. The **continuous arrows** show the call path while the firmware runs. The `Application` calls functions from the `IO_Driver` that calls `HAL_GPIO` functions that deal with GPIO peripheral registers to set pin levels. The **dashed** arrows indicate the path we'll be dealing with now where the `tst_IO_driver` calls the `IO_driver` while running the tests, the `IO_driver` calls the `mock_HAL_GPIO` (without even knowing it), the `mock_HAL_GPIO` uses functions from the `Cppumock` framework to inform the test every function call it that was executed and which parameters were sent to them. 

![image](/assets/images/Diagram_io_driver_mock.png){: .center-image }

Everything in the **dashed path** must be compilable in the test environment as known as the computer we are coding at. Any microcontroller dependent functions used at the `IO_driver` must have a mock function that will be called instead of the real `HAL GPIO` functions. All the mock functions MUST follow the function prototype of the real `HAL_GPIO`, the mock will include the original `HAL_GPIO` header file (`stm32f3xx_hal_gpio.h`) to enforce this. This is not a big deal since the STM32 header files are well structured but will probably require adding a few include paths to the test Makefile. 

> _Spoiler alert:_ There are reasons to create a header file for the implemented mock and I will get there in the future. It is not required at this moment.

## Mock creation

This is the moment to set the folders structure inside the `test` folder. My choice is going like this:

```
└── test
    ├── drivers
    |   └── test_IO.cpp
    └── mocks
        └── drivers
            └── mock_hal_gpio.c
```

The file extensions are important here. The *test* is coded as C++ to get a more efficient use of Cpputest. The *mock* is coded as C since the original library being mocked is in this language too. This will avoid linker errors between the `IO_driver` and the mock. The Cppumock provides the full set of tools and functions in C++ and C. The C version is a bit more confuse since it tries to emulate an object oriented implementation with pointers and structures but it is not rocket science and is learned quickly.

I suggest keeping open the `stm323xx_hal_gpio.h` (it is located under `Drivers/STM32F3xx_HAL_Driver/Inc/`) to understand what it implements since it will be included in the mock file. Copying from there the prototype for each function that will be mocked is a helper too. 

The first version of `mock_hal_gpio.c` includes the Cppumock framework and the `HAL_GPIO` header and looks like this:

```c
#include <CppUTestExt/MockSupport_c.h>

#include <stm32f3xx_hal_gpio.h>

GPIO_PinState HAL_GPIO_ReadPin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin){
    return 0;
}

void HAL_GPIO_WritePin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin, GPIO_PinState PinState){

}
```

## Makefile edition

Add these lines to the Test Makefile so it will find the Mock and `IO_driver` files:

```
# project source files path
SRC_DIRS+=$(PROJECT_DIR)/bugfree/drivers/io


# project header files path
INCLUDE_DIRS+=$(PROJECT_DIR)/Inc
INCLUDE_DIRS+=$(PROJECT_DIR)/Drivers/STM32F3xx_HAL_Driver/Inc
INCLUDE_DIRS+=$(PROJECT_DIR)/Drivers/CMSIS/Device/ST/STM32F3xx/Include
INCLUDE_DIRS+=$(PROJECT_DIR)/Drivers/CMSIS/Include

## test source files path
TEST_SRC_DIRS+=$(TEST_DIR)/drivers

## mock path
MOCKS_SRC_DIRS=$(TEST_DIR)/mocks
MOCKS_SRC_DIRS=$(TEST_DIR)/mocks/drivers

#---------------------- Build flags ------------------
CPPUTEST_CPPFLAGS+=-DSTM32F302xC
#CPPUTEST_CPPFLAGS+=-Wno-error=unused-parameter`

# Add the library linking to use Cppumock
LD_LIBRARIES += -L$(CPPUTEST_HOME)/lib -lCppUTestExt

```


This is probably enough to build the test without include errors. At this point I get a few times this error `-Werror=unused-parameter` that is due the emptiness of our mock's first version and Cpputest default behavior of compiling with a lot of warnings enabled and treating all warnings as errors.

There are two possible solutions for this:
- downgrading this error to a uncommenting the line `CPPUTEST_CPPFLAGS+=-Wno-error=unused-parameter` in the Makefile
- doing something useless with the input parameters inside the functions

I usually executed the second option so my the messages after the test build process are empty but a friend has convinced me to use the first option. It will allow the test to build and execute and keep showing warnings for useless parameters on every build. This can help in detecting parameters that should have some use inside the function but got forgotten and parameters that became useless as code advanced and could be removed. 

## Creating the test 

The first version for my IO library will verify only the function `io_setHigh` and `io_setLow`, for a single IO pin (`IO_LED_GREEN`). This Tag is defined inside an enum in `io.h` as all IO devices required for this firmware. THis test includes the `MockSupport_c.h` and calls some of its functions. 

The `teardown()` is a code section that will be executed after every test in the test group. In this test it executes `mock_c()->checkExpectations()` to verify if all expected calls defined in a test were executed as required and `mock_c()->clear()` to desalloc everything created in the mock functions for this test so no warning about memory leak will show up due this library. The first version of this test will look like this:

```c
#include <CppUTest/TestHarness.h>
#include <CppUTestExt/MockSupport_c.h>

extern "C"{
    #include "bugfree/drivers/io/io.h"
}
#include <main.h>

TEST_GROUP(driver_io){
    void teardown (){
        mock_c()->checkExpectations();
        mock_c()->clear();
    }
};

TEST (driver_io, set_pin_high){
    mock_c()->expectOneCall("HAL_GPIO_WritePin")
            ->withPointerParameters    ("GPIOx",    GPIOB)
            ->withUnsignedIntParameters("GPIO_Pin", GPIO_PIN_6)
            ->withUnsignedIntParameters("PinState", GPIO_PIN_SET);
    io_setHigh (IO_LED_GREEN);
}


TEST (driver_io, set_pin_low){
    mock_c()->expectOneCall("HAL_GPIO_WritePin")
            ->withPointerParameters    ("GPIOx",    GPIOB)
            ->withUnsignedIntParameters("GPIO_Pin", GPIO_PIN_6)
            ->withUnsignedIntParameters("PinState", GPIO_PIN_RESET);
    io_setLow (IO_LED_GREEN);
}
```

Both tests verify that the IO library is calling the HAL_GPIO functions with the correct parameters (port, pin and state). The io function is called after the expectations are set and the mock functions implemented in `mock_hal_gpio.c` are responsible for snitching that they were called and the received parameters. The mock is coded like this:

```c
#include <CppUTestExt/MockSupport_c.h>
#include <stm32f3xx_hal_gpio.h>

GPIO_PinState HAL_GPIO_ReadPin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin){
    return 0;
}

void HAL_GPIO_WritePin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin, GPIO_PinState PinState){
    mock_c()->actualCall("HAL_GPIO_WritePin")
            ->withPointerParameters("GPIOx", GPIOx)
            ->withUnsignedIntParameters("GPIO_Pin", GPIO_Pin)
            ->withUnsignedIntParameters("PinState", PinState);
}
```

### Coding the IO driver

ALl the changes to this point were pushed in [this commit](https://github.com/matheusmbar/bugfree_robot/commit/91f710e665c9c8c4c41b0a8803881e94f77715dc). Although building the project like this returns these errors:

```
bugfree_robot/test/drivers/test_IO.cpp:25: 
error: Failure in TEST(driver_io, set_pin_low)
    Mock Failure: Expected call WAS NOT fulfilled.
    EXPECTED calls that WERE NOT fulfilled:
        HAL_GPIO_WritePin -> void* GPIOx: <0x48000400>, unsigned int GPIO_Pin: <64 (0x40)>, unsigned int PinState: <0 (0x0)> (expected 1 call, called 0 times)
    EXPECTED calls that WERE fulfilled:
        <none>

.
bugfree_robot/test/drivers/test_IO.cpp:16: 
error: Failure in TEST(driver_io, set_pin_high)
    Mock Failure: Expected call WAS NOT fulfilled.
    EXPECTED calls that WERE NOT fulfilled:
        HAL_GPIO_WritePin -> void* GPIOx: <0x48000400>, unsigned int GPIO_Pin: <64 (0x40)>, unsigned int PinState: <1 (0x1)> (expected 1 call, called 0 times)
    EXPECTED calls that WERE fulfilled:
        <none>
```

They are self explanatory, telling that our 2 new tests failed with expected function calls that have not been called. It even lists the expected parameters in each one of them. We are done with the stages "Code the test", "Make it compile" and "Watch it fail" or our TDD cycle. It is now time to make the test pass by coding the IO driver. 

This `io.c` satisfies all the tests for now, but works only for `IO_LED_GREEN`. Remember not coding more than your tests require. It's not required testing for all the GPIOs but some will get added later in the tests and in the library.

```c
#include "io.h"

#include "main.h"
#include "stm32f3xx_hal_gpio.h"

/* Private Data typedefs------------------------------------------------------*/

typedef struct{
    uint16_t pin;
    GPIO_TypeDef* port;
}io_gpio_t;

/* Private Variables ---------------------------------------------------------*/

static const io_gpio_t gpio_array [] = {
    [IO_LED_GREEN]  = {LED_GREEN_Pin,   LED_GREEN_GPIO_Port},
};

/* Public Functions ----------------------------------------------------------*/

/* Sets a GPIO pin to HIGH level */
void io_setHigh (io_dev_t device){
    HAL_GPIO_WritePin(gpio_array[device].port, 
                        gpio_array[device].pin, GPIO_PIN_SET);
}

/* Sets a GPIO pin to LOW level */
void io_setLow  (io_dev_t device){
    HAL_GPIO_WritePin(gpio_array[device].port, 
                        gpio_array[device].pin, GPIO_PIN_RESET);
}
```

One step were skipped in this article: making tests for the mock library. It may seem like too much effort but mock libraries must reflect the real behavior of what they are replacing. This HAL_GPIO is simple but replacing a external flash memory CI and all its interfaces are pretty complicated. I'll add tests for this mock in the next commit probably but without writing about them, pay attention for the commit timeline to check this. 

I'm ending here with the [commit link](https://github.com/matheusmbar/bugfree_robot/commit/a0bcb46f2e6e50fb87549fae7c0cdd1474795944) as always. 

---

A small bonus pointer is adding this section on the Makefile so the build process logs are cleaner and easier to understand:
```
#Reduce the excess of prints in the build process
ifndef SILENCE
    SILENCE = @
endif
```
