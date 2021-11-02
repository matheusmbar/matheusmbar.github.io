---
layout: post
title: improving peripherals with DMA
categories: [bugfree-robot]
tags: [embedded, programming, code, DMA, UART, ADC]
comments: true
footnote: 
---

There will always be peripherals to use and drivers to implement in embedded programming. And learning how to use them isn't usually a moment to apply TDD since it's more about testing configurations and commands than well structured functions that will make their way to production code. 

With that out of the way, this post won't include test code, it is actually the working result of a learning through development process I took recently. It was one with many mistakes that got closer to [Extreme Go Horse](https://medium.com/@dekaah/22-axioms-of-the-extreme-go-horse-methodology-xgh-9fa739ab55b4) programming than to TDD actually. 

<!--more-->

## UART

I've been thinking about the development of a communication protocol and drivers for the bugfree-robot. It's hardware provides three main communication ports: 2 full duplex UARTs and one USB port. None of them would allow remote communication to act as telemetry (USB for sure not) although the first idea in this project was connecting a cheap Bluetooth-serial module like HC-05, HC-06, HM-10 or something like that. They don't allow a really high throughput but at max speed it may be enough for transmitting information about its sensors and control parameters. 

The plan is connecting a computer with bluetooth and run a simple software to receive debug and telemetry data and adjust operation parameters on the fly, without need to execute these changes in the firmware. This software will probably run on Python for simplicity and is a topic for later.

UART (Universal Asynchrounous Receiver/Transmiter) is one of the most common communication methods in not so advanced embedded systems and is basically a full-duplex Asynchrounous interface. There is no clock line so both devices must keep track of their own time keeping to transmit and receive each byte correctly. Many microcontrollers provide a more enhanced peripheral called USART (Universal Synchronous/Asynchrounous Receiver/Transmiter) that is compatible with UART too. 

I won't get in more detail about the interface itself. The topic here is the development of a driver for this firmware that will handle the UART communication for both reception and transmission, while interfacing with other libraries in the firmware that desire to communicate with an external device. These higher level libraries will implement some communication protocol, that is beyond this driver's responsibility.

This project's microntroller provides three 

## ADC