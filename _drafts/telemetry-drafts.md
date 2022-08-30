---
# layout: post
# title: improving peripherals (UART) with DMA
# categories: [bugfree-robot]
# tags: [embedded, programming, code, DMA, UART]
# comments: true
# footnote:
---


basic idea:

The plan is connecting a computer with bluetooth and run a simple software to receive debug and telemetry data and adjust operation parameters on the fly, without need to execute these changes in the firmware. This software will probably run on Python for simplicity and is a topic for later.



## UART driver:

This article will be dedicated on implementing a driver layer for the UART driver that is integrated with DMA peripheral, stores received data in a buffer and runs a callback when data there is data available.

I won't get in more detail about the interface itself. The topic here is the development of a driver for this firmware that will handle the UART communication for both reception and transmission, while interfacing with other libraries in the firmware that desire to communicate with an external device. These higher level libraries will implement some communication protocol, that is beyond this driver's responsibility.


## PROTOBUF

Use Google's protobuf as interface between devices
