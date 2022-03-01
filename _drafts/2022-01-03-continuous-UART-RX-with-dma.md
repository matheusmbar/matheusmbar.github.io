---
layout: post
title: continuous UART RX with DMA
categories: [bugfree-robot]
tags: [embedded, programming, code, DMA, UART]
comments: true
footnote: "Infinite reception circular loop"
---

This article will continue the analysis and implementation of a UART driver that was started in the [last post]({{ site.baseurl }}{% post_url 2021-11-14-improving-UART-TX-with-dma %}), but now focusing in data receptions instead of transmission. As explained before, there will be not use of TDD at this moment since the main focus are using the UART functions provided by the STM32 hardware abstraction layer libraries, comparison between the methods provided and how to better use them in a firmware project.

<!--more-->

# UART

The UART peripheral is able to work as a full duplex communication interface, with TX and RX running continuously at all times. But that does not come fully implemented and ready for use in the HAL library. The data transmission was already explained, and now we'll get to the details about receiving data. This part is more interesting although but requires the implementation of a few functionalities related to data reception and storage.

## Receiving data (RX)

Many embedded devices may assume that they will work as the master device while communicating through UART. This may implicate a few aspects that will simplify the firmware:
- knowing when data will be received (usually only after executing a TX)
- knowing an estimated amount of data that will be received
- nothing will be received without being expected

That is not the situation that I'm trying to achieve here. The objective here is getting to build a UART driver that meets these **requirements**:
- allows receiving data at any moment
- no need to know exactly how many bytes will arrive
- not losing any received bytes

The `HAL_UART_Receive` methods provided by the STM32 default libraries are similar to the ones available for `HAL_UART_Transmit` and explained in the other article. Let's talk a little bit about each one of them.

### 1. **HAL_UART_Receive**

```c
HAL_StatusTypeDef HAL_UART_Receive(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout)
```

This function will receive data in blocking mode, returning only when the amount of data requested is received or when the timeout is reached. Tha implicates that the firmware execution stays halted while none of these exit conditions are met and that additional bytes received will be discarded.

This implementation is capable of dealing with the *UART master* usage case indicated above, considering that there is no need to execute other tasks while waiting for data reception.

### 2. **HAL_UART_Receive_IT**

```c
HAL_StatusTypeDef HAL_UART_Transmit_IT(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size)
```

This function will activate the UART peripheral to receive an amount of bytes and store what is received in the memory address provided. The end of reception triggers the execution of an **interrupt callback** (as log as it is configured correctly). It will not halt the code execution. There is no timeout, so the callback will not run unless the amount of data requested is received. Additional bytes received are discarded. That does not look very good, right?

A deeper inspection of the library shows that each received byte triggers a low level interrupt callback, similar to what happens on the transmission. This callback executes these steps:
- check for errors
- check if all the data requested was received
  + finish reception
  + execute end of reception callback
- update state variables and set receive the next byte

This results in interrupting the main execution flow for each byte.


Take a look at function `HAL_UART_IRQHandler` to understand where it is happening. It runs after each byte is received in this mode, calling `huart->RxISR(huart)` to store the byte received in the output memory array. This function pointer calls `UART_RxISR_8BIT` or `UART_RxISR_16BIT` based on the peripheral configuration. They are implemented at `stm32f3xx_hal_uart.c`. Here is `UART_RxISR_8BIT` as an example:


```c
static void UART_RxISR_8BIT(UART_HandleTypeDef *huart){
  uint16_t uhMask = huart->Mask;
  uint16_t  uhdata;

  /* Check that a Rx process is ongoing */
  if (huart->RxState == HAL_UART_STATE_BUSY_RX){
    uhdata = (uint16_t) READ_REG(huart->Instance->RDR);
    *huart->pRxBuffPtr = (uint8_t)(uhdata & (uint8_t)uhMask);
    huart->pRxBuffPtr++;
    huart->RxXferCount--;

    if (huart->RxXferCount == 0U){
      /* Disable the UART Parity Error Interrupt and RXNE interrupts */
      CLEAR_BIT(huart->Instance->CR1, (USART_CR1_RXNEIE | USART_CR1_PEIE));
      /* Disable the UART Error Interrupt: (Frame error, noise error, overrun error) */
      CLEAR_BIT(huart->Instance->CR3, USART_CR3_EIE);
      /* Rx process is completed, restore huart->RxState to Ready */
      huart->RxState = HAL_UART_STATE_READY;
      /* Clear RxISR function pointer */
      huart->RxISR = NULL;
      /*Call registered Rx complete callback*/
      huart->RxCpltCallback(huart);
    }
  }
  else{
    /* Clear RXNE interrupt flag */
    __HAL_UART_SEND_REQ(huart, UART_RXDATA_FLUSH_REQUEST);
  }
}
```

### 3. **HAL_UART_Receive_DMA**


```c
HAL_StatusTypeDef HAL_UART_Receive_DMA(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size)
```

This function will run almost exactly as `HAL_UART_Receive_IT`, but including a DMA channel in the process.
The reception will run in background but the DMA will take care of storing the received bytes, so there won't be an ISR call after each byte as before. That will free many processing cycles and reduce context switching from the main application.

There are only two (optional) callbacks executed in this process:

- **HAL_UART_RxHalfCpltCallback**
    -  Called when half the buffer was received
    -  It may indicate a moment to start processing the partial data

- **HAL_UART_RxCpltCallback**
    - Called when all the data was received
    - It indicates that all requested data has been received

This implementation improves a lot of pain points show in the other ones, since the reception does not run in blocking mode and there is no callback executed for each byte. There is still the requirement to know the exact amount of bytes to receive, so it is not enough yet.


## Additional layer for data reception

The default HAL library provided by STM will not be enough to achieve all the requirements. The next step is implementing a UART driver library to complement the missing functionalities. These may be split in parts for an easier comprehension and implementation.


### Idle line detection

The UART peripheral in this microcontroller provides an awesome feature called **Idle Line Detection**. That allow setting it up to trigger an interrupt every time that the RX line gets transitions from active to inactive. That indicates that data was being received and stopped, so a full data frame is probably available for processing in the reception memory buffer. This helps a lot the problem of needing to know the amount of data that will be received beforehand.

This feature is not available to setup while configuring the peripheral through STM32Cube GUI, so it is required to call a `HAL_UART` low level function that enables this interrupt flag. This is a simple call that will reside in the `init` function of our custom UART library.

```c
void uartDriver_init(void){
    __HAL_UART_ENABLE_IT(buffer->huart, UART_IT_IDLE);
}
```

The generated code does not checks for this interrupt flag in the `UARTxIRQHandler` that is executed on all interrupts triggered for the UART peripherals. A small change in this callback is required as well. This is implemented in `stm32f3xx_it.c`.

PS: A callback must be implemented to execute when this condition is triggered. It will show up here and be detailed later. For now just accept that it is called `uartDriver_lineIdle()`.

```c
void UART4_IRQHandler(void)
{
  /* USER CODE BEGIN UART4_IRQn 0 */
  //check for idle flag
  if (__HAL_UART_GET_IT(&huart4, UART_IT_IDLE)){
	  //clear interrupt flag
	  __HAL_UART_CLEAR_IT(&huart4, UART_CLEAR_IDLEF);
	  uartDriver_lineIdle(&buff_u4, huart4.hdmarx->Instance->CNDTR);
  }
  /* USER CODE END UART4_IRQn 0 */
  HAL_UART_IRQHandler(&huart4);
  /* USER CODE BEGIN UART4_IRQn 1 */

  /* USER CODE END UART4_IRQn 1 */
}
```

Remember that there is usually one of this for each UART peripheral, so add the correct calls for each one of them when required.

### Continuous reception

The three methods provided by STM described above stop receiving data and need a restart every time.

peripheral setup: DMA CIRCULAR


.....

### :warning: idleLine handler function



## Closing points

