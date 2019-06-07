---
layout: post
title: a robot with a purpose
categories: [bugfree-robot]
tags: [embedded, hardware]
comments: true
footnote: Finally some hardware around here!
---

I've already spent so many sequential articles talking about TDD, Cpputest and codes that can run for applications anywhere. It is time to take a break on that and show up some details about the **hardware** that this firmware is being developed to. 

The objective of this firmware is (at first) to run in a line follower robot. This kind of robot is intended run autonomously in a track looking for completing it as fast as possible in competitions. The track is usually drawn with a white tape over a black rubber mat glued to a wood plain surface. It is composed by straight lines and some curves and each competition lists some rules about the minimum straight lengths, curve radius, line width and crossings.

The tracks use to provide indications at start and end of the curves and start/end of the track. These marks can be used to help the robot dividing the track in sections and optimizing its behavior to get faster in each section. A common strategy is accelerating to high speeds in long straight sections and braking before the next curve to avoid losing it. Encoders are recommended to allow distance measurements and the latter strategy.

<!--more-->

Detecting the track's lines is a task almost always executed by reflective object sensors. Each one of those combine an infrared LED emitter and a phototransistor like the [QRE1113](https://www.sparkfun.com/datasheets/Robotics/QR_QRE1113.GR.pdf). The sensor output is connected to a simple passive circuit that makes its information readable by microcontrollers. The two main approaches for this circuit are:

- convert the sensor output to a voltage proportional to object's reflectivity and read it with an ADC
- create a R/C circuit, apply a voltage pulse to the sensor and measure the time it takes to discharge the capacitor

The latter removes the requirement of an ADC pin to read each pin since any digital I/O will get the job done, although the read will require a timer and the voltage that a digital pin goes from logic HIGH to logic LOW is a gray area in the digital world.

I've always preferred dedicating some ADC pins and reading analog values. It is faster and simpler. Some calibration is added to define the threshold between white and black detections and voilà, a robot that can "see" in black and white.

The robot I'm working on will run over a PCB designed by myself specially for this. Its project is not published (at least not yet, maybe I'll do that some time in future) but much of its components will be detailed in around here. The motivation to design a PCB is merging in a single hardware everything required to read the sensors, control the motors and blinking LEDs (this one cannot be left out, alright?). This saves a lot of time soldering cables and debugging bad connections, with a plus of reducing the robot's weight (an important variable to get good results).

This PCB is called Lino v1 and includes these items:

- STM32F302RCT6 ARM Cortex M4 with FPU, 72MHz max freq, 256kB FLASH + 40 kB RAM memory
- SWD debug connector
- TB6612 dual DC motor driver
- micro USB connector
- 2 I/O tactile buttons + 1 for reset 
- 4 LEDs
- 4 Mbit flash memory
- buzzer
- 2 quadrature encoders inputs
- 2 full duplex UART headers
- 1 I2C header
- 10 analog inputs

The microcontroller is the main component of course. It was chosen due to its big FLASH and RAM memory sizes, high I/O and interfaces count, timer capable of handling quadrature encoders, floating point unit and integrated USB controller. It has almost any resources that I've ever thought about using while programming a line follower robot. It provides a processing power around the highest ones I've ever seen in competitive robots (and you can be sure that I'm ignoring here anyone who though about embedding a Raspberry Pi, it requires a HUGE battery and has a hardware not intended for this at all).

I'm looking for a picture of the PCB to add here and will update this article with it soon. 

The next on will be about creating a basic firmware project and showing the steps to build and test code that interacts with microntroller's peripherals 