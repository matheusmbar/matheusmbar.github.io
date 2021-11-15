---
layout: post
title: improving UART TX with DMA
categories: [bugfree-robot]
tags: [embedded, programming, code, DMA, UART]
comments: true
footnote: "Don't bother me until you finished all your TX! - said the processor"
---

There will always be peripherals to use and drivers to implement in embedded programming. And learning how to use them isn't usually a moment to apply TDD since it's more about testing configurations and commands than well structured functions that will make their way to production code. 

With that out of the way, this post will be the first of a few ones that won't include test code, they are actually the working result and documentation of a learning through development and testing process I took recently. These efforts tend to get closer to [Extreme Go Horse](https://medium.com/@dekaah/22-axioms-of-the-extreme-go-horse-methodology-xgh-9fa739ab55b4) programming than to TDD actually 👀 but they are an important part of the journey. 

I've been thinking about the development of a communication protocol and drivers for the bugfree-robot. Its hardware design provides three main communication ports: 2 full duplex UARTs and one USB port. None of them would work directly for wireless telemetry (USB for sure not) although  it is possible to connect simple and cheap Bluetooth-serial modules like the HC-05, HC-06, HM-10 or similar. They don't allow a high throughput but it may be enough for transmitting information about its sensors and control parameters. 

<!--more-->
# UART

UART (Universal Asynchronous Receiver/Transmitter) is one of the most common communication methods in not so advanced embedded systems and is basically a full-duplex Asynchronous interface. There is no clock line so both devices must keep track of their own timing to transmit and receive each byte correctly. Many microcontrollers provide a more enhanced peripheral called USART (Universal Synchronous/Asynchronous Receiver/Transmitter) that is compatible with UART too. 

This peripheral allows continuous bidirectional communication between two devices (i.e. full-duplex) but this does not work automatically. 
An interface driver is usually implemented to interface ths peripheral with the application code. 

## Transmitting data (TX)


Transmitting data continuously is almost as easy as one may think. As long as the application always has data to transmit, it is usually as simple as calling some sort of `UART_Transmit(char* data, uint8_t len)` as many times as needed. The next transmission may start after it has finished transmitting this data array. The `HAL_UART` default library provided for the STM32 includes three functions for this task:

### 1. **HAL_UART_Transmit**
   
```c
HAL_StatusTypeDef HAL_UART_Transmit(
    UART_HandleTypeDef *huart, 
    uint8_t *pData, 
    uint16_t Size, 
    uint32_t Timeout)
```

This function will check the input parameters and peripheral state. It will return only after all the data is transmitted, except on errors. The bad side is that the firmware execution will halt until all data is transmitted, it is a kind of pooling for a finished execution. 



### 2. **HAL_UART_Transmit_IT**

```c
HAL_StatusTypeDef HAL_UART_Transmit_IT(
    UART_HandleTypeDef *huart, 
    uint8_t *pData, 
    uint16_t Size)
```

This function will check the input parameters and peripheral state, request the transmission start and return a status code. The indication of the end of transmission happens through and **interrupt callback** (as long as it is configured correctly). It will not halt the code execution, so the application may keep running other tasks while data is being transmitted. It must monitor the callback execution to know when it may start another data transmission. 

There is a performance hit that it not clearly seen at first sight. The UART peripheral knows only about the next byte that it must transmit. After each byte is transmitted, an interrupt callback is called to run a few steps:
- check for errors
- check if all the data array was transmitted
  - finish transmission in this case
- update state variables and set the next byte to transmit

This will take some of the processing cycles away from the application, besides interrupting its execution as many times as bytes in the data array.

Take a look at function `HAL_UART_IRQHandler` to understand where it is happening. It runs after each byte is transmitted in this mode, calling `huart->TxISR(huart)` to advance in the data array. This function pointer calls `UART_TxISR_8BIT` or `UART_TxISR_16BIT` based on the peripheral configuration. They are implemented at `stm32f3xx_hal_uart.c`. Here is `UART_TxISR_8BIT` as an example:

```c
static void UART_TxISR_8BIT(UART_HandleTypeDef *huart){
  /* Check that a Tx process is ongoing */
  if (huart->gState == HAL_UART_STATE_BUSY_TX){
    if (huart->TxXferCount == 0U){
      /* Disable the UART Transmit Data Register Empty Interrupt */
      CLEAR_BIT(huart->Instance->CR1, USART_CR1_TXEIE);

      /* Enable the UART Transmit Complete Interrupt */
      SET_BIT(huart->Instance->CR1, USART_CR1_TCIE);
    }
    else{
      huart->Instance->TDR = (uint8_t)(*huart->pTxBuffPtr & (uint8_t)0xFF);
      huart->pTxBuffPtr++;
      huart->TxXferCount--;
    }
  }
}
```

### 3. **HAL_UART_Transmit_DMA**

```c
HAL_StatusTypeDef HAL_UART_Transmit_DMA(
    UART_HandleTypeDef *huart, 
    uint8_t *pData, 
    uint16_t Size)
```

This function will run almost exactly as `HAL_UART_Transmit_IT`, but including a DMA channel in the process. 
The transmission will run in background but the DMA will take care of feeding the bytes to transmit, so there won't be an ISR call after each byte as before. That will free many processing cycles and reduce context switching from the main application.

There are only two (optional) callbacks executed in this process:

- **HAL_UART_TxHalfCpltCallback**
    -  Called when half the buffer was transmitted
    -  It may indicate a moment to start preparing the next data array

- **HAL_UART_TxCpltCallback**
    - Called when all the data was transmitted
    - It indicates that another transmission may start


## Closing points

There is not much to implement regarding Transmission in a UART driver, at least nothing that I'd call as a requirement. For some applications a way to protect the resource with a Mutex or Semaphore may be useful. The functions provided by default in the `HAL_UART` are capable of handling it well for most of the simpler cases.

Combining it with DMA may save processing power as explained above, it is basically putting peripherals to work in a parallel pipeline that the processor does not need to worry about while the transmission has not finished. Knowing how to do it may help on optimizations and applications that demand more from the processor.

The next article will be about **reception**, that is when things get more interesting since the default driver helps but don't go too far on solving everything that one may need.