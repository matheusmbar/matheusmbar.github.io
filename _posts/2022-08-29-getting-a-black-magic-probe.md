---
layout: post
title: getting a Black Magic Probe
categories: [tools]
tags: [embedded, programming, JTAG, debugger]
comments: true
footnote: "Better tools may help a lot on harder challenges"
---

I've heard recently in a C++ conference talk that:
>C programmers love debugging, they do all the code just to get to the debugging part".

Am I going to disagree with that? Yeah, probably. 
- applying TDD and intelligent development practices intend to help on that
- good tests will avoid a lot of time spent on debugging directly in the target
- debugging test code in the host machine is a lot easier since it removes limits from the remote debugging.

With that out of the way, a good programmer and debugger is still a required tool for embedded development. A bad one may result in many hard to detect problems and  a lot of frustration. Anyone that took some time researching about ARM debuggers has for sure read many talking about the [Black Magic Probe](https://1bitsquared.com/products/black-magic-probe) from 1BitSquared. I've finally decided to take some time and test it to find out how much better it can be than a regular ST-Link.

<!--more-->

# What is a Black Magic Probe
For those that have no clue about it, a good description is provided by their creators:
> **Black Magic Probe V2.3** (BMP) designed by [1BitSquared](http://1bitsquared.com/) is a JTAG and SWD Adapter with a built in GDB server used for programming and debugging ARM Cortex MCUs. Its the best friend of any ARM microcontroller developer.
> 
> (...)
> 
> Black Magic Probe gets rid of intermediate programs like OpenOCD or STLink server. This makes the operation faster and more reliable. You just open your GNU Debugger (GDB) and select the virtual com port offered by BMP23 as your extended remote target.

There are many good recommendations for it from reputable sources that provide more information about its functionality:
- Elliot Williams @Hackaday - [BLACK MAGIC PROBE: THE BEST ARM JTAG DEBUGGER?](https://hackaday.com/2016/12/02/black-magic-probe-the-best-arm-jtag-debugger/)
- Sergio Prado (in Portuguese) -  [Introduction to Black Magic Probe](https://sergioprado.org/introducao-black-magic-probe/), [Debugging with a Black Magic Probe](https://sergioprado.org/depurando-com-black-magic-probe/)
- Blackmagic.org - [Black Magic Debug: The Plug&Play MCU Debugger](https://black-magic.org/)

It is a generic JTAG/SWD debugger for embedded microcontrollers, supporting multiple vendors and platforms through an embedded GDB server. It provides UART ports and SWO debug printing too - that turns out useful now and there, right?

I will provide more information about what this changes in the programming/debugging process in another article since I haven't had time to use it yet.

Another important point about it, is that they sell the hardware but the firmware is open source ([GNU GPL 3.0](https://github.com/blackmagic-debug/blackmagic/blob/main/COPYING)), so it is available for use in any application, including commercial use. There is even official support for building the firmware for the famous Blue Pill development boards with the STM32F103 microcontroller. I have a few of them around, so this is the better way to start.

The instructions described here are intended as a fast guide to come back to when required. I've found a great guide at [JeeLabs](https://jeelabs.org/202x/bmp/) that worked perfectly. So take some time to read more details from there.

# Obtain the firmware
Since this hardware has official support from the firmware maintainers, there are build provided for it [here](http://builds.blacksphere.co.nz/blackmagic/). Go there and download the required binaries:
- `swlink`
- `swlink DFU`

## Compiling the firmware
It is also possible to compile the bleeding edge firmware by yourself and it is very easy too:

- get the [ARM GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)
- extract it and add its folder to your system PATH
	+ `export PATH=/path/to/gcc-arm-none-eabi-xx.x-xxxx.xx/bin:$PATH`
	+ test it running `arm-none-eabi-gcc -v`
- clone the repository and compile it

```shell
git clone https://github.com/blackmagic-debug/blackmagic.git
cd blackmagic
git submodule init
git submodule update
make -j $(nproc)
cd src/
make clean
make PROBE_HOST=swlink -j $(nproc)
```
 The required binaries will be in the `src` folder.

# Programming the firmware
There are only two requirements to execute this:
- a STM32F103 Blue Pill board
- being able to program it

The second point may be trick, but it is impossible to avoid it. There are many ways to program a STM32 microcontroller:
- using a cheap ST-Link (path followed here)
- borrowing a programmer
- using the STM32 ROM bootloader with USB to UART adapter (not sure about the support for this hardware, it is probably there)


## Software and upload
I've used the open source software [stlink](https://github.com/stlink-org/stlink) to program the Black Magic Probe firmware to the hardware. The documentation in the repository explains its installation and use.
Most Blue Pill boards are populated with the STM32F103C8, that officially contains 64 KB of flash. The BMP firmware needs 128 KB. It seems wrong and impossible to fit.

It is well known at this moment in the embedded community that due characteristics of [economies of scale](https://en.wikipedia.org/wiki/Economies_of_scale), they are all manufactured targeting 128KB of flash memory, even if the part number indicates otherwise. There is even a [Bluepill Diagnostics](https://mecrisp-stellaris-folkdoc.sourceforge.io/bluepill-diags-v1.640.html) project developed to test your device, for me it confirmed that the extra memory section is available.

The `--flash=128k` forces the software to accept the bigger size. There is a chance that part of this memory is invalid and not intended to use, so remember that if some weird behavior is detected. use this information at your own risk and NEVER trust this memory section for real products.

Connect the board to the programmer, check that both BOOT jumpers are at position 0 and use this code to program the microcontroller:

```shell
# instructions to program with a ST-Link v2 or similar
cd blackmagic/src
st-flash --reset write blackmagic_dfu.bin 0x8000000
st-flash --flash=128k write blackmagic.bin 0x8002000
```

Now the board is running the BMP firmware. Connect its USB to the computer and check if it will enumerate correctly.

```shell
$ lsusb
Bus 001 Device 003: ID 1d50:6018 OpenMoko, Inc. Black Magic Debug Probe (Application)
```

## Connections
The next step is connecting the programmer to another target board to test it.There is detailed information about the pinout [here](https://github.com/blackmagic-debug/blackmagic/blob/main/src/platforms/swlink/README.md). The following table is a basic pinout reference for SWD connection:

```
| SWD Function |     Pin      |
|--------------|--------------|
| SWDIO        | PA13 (SWD)   |
| SWCLK        | PA14 (SWCLK) |
| nRST         | PB4          |
| UART1_TX     | PB6          |
| UART1_RX     | PB7          |
| SWO / RX2    | PA3          |
```

And this is the pinout for JTAG:
```
| JTAG Function |     Pin      |
|---------------|--------------|
| JTMS          | PA13 (SWD)   |
| JTCK          | PA14 (SWCLK) |
| JTDI          | PA15         |
| JTDO          | PB3          |
| nRST          | PB4          |
| UART1_TX      | PB6          |
| UART1_RX      | PB7          |
| UART2_RX2     | PA3          |
```

Pins PA13 and PA14 are available **only in the programming header** for the board used as BMP, in the pins with the same name. The connections to program another Blue Pill with SWD would be:
```
BMP          Target
-------------------
SWD    <-->  SWD
SWCLK  <-->  SWCLK
PB4    <-->  Reset
3V3    <-->  3V3
GND    <-->  GND
```


## Debugging
Debugging will require a firmware binary compiled for the target board. I'm assuming `main.elf` as the filename for next steps.

The Black Magic Probe provides one serial port as its GDB interface (smaller ID) and another one as a regular serial port. 
```shell
$ ls -l /dev/ttyACM*
crw-rw---- 1 root dialout 166, 0 ago 29 21:24 /dev/ttyACM0
crw-rw---- 1 root dialout 166, 1 ago 29 20:32 /dev/ttyACM1

$ arm-none-eabi-gdb main.elf
```

After starting GDB, the following commands setup the connection with Black Magic Probe and starts the debugging session.
```shell
(gdb) target extended-remote /dev/ttyACM0

# check BMP help
(gdb) monitor help

# check firmware version
(gdb) monitor version

# find targets available
(gdb) monitor swdp_scan
Available Targets:
No. Att Driver
 1      STM32F1 medium density M3

(gdb) attach 1
(gdb) load main.elf
Loading section .text, size 0x2e lma 0x8000000
Start address 0x08000000, load size 111
Transfer rate: 505 bytes/sec, 111 bytes/write.

# enable tui mode
(gdb) tui enable
```

Using GDB directly will probably seem too complicated for those that have never done it. This is a skill that may be useful some day since some projects and environments make it hard to integrate graphical tools.

That is not a requirement to use Black Magic Probe. I'm sure that it is possible to use it integrated with IDEs and that some setup will be required. It seems like a good subject for another article and an ending for this one.
