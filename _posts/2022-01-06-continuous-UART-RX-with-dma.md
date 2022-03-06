---
layout: post
title: continuous UART RX with DMA
categories: [bugfree-robot]
tags: [embedded, programming, code, DMA, UART]
comments: true
footnote: "Infinite reception circular loop"
---

This article will continue the analysis and implementation of a UART driver that was started in the [last post]({{ site.baseurl }}{% post_url 2021-11-14-improving-UART-TX-with-dma %}), but now focusing in data reception instead of transmission. As explained before, there will be no use of TDD at this moment since the main focus are using the UART functions provided by the STM32 hardware abstraction layer libraries, comparison between the methods provided and how to better use them in a firmware project.

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

The three methods provided by STM described above stop receiving data and need a restart every time. That results in a chance of data loss and additional operations to keep reception running.

The DMA method is the only one that allows operating in a continuous reception mode so it won't stop receiving data and no restart will be required. In order to do that, the DMA Channel selected to operate with the UART RX must be in a special mode called `DMA_CIRCULAR` (the default is `DMA_NORMAL`). This option will instruct the DMA peripheral to not stop the reception in the end of the reception buffer but return to its beginning, overriding old data with new bytes.

This is part of the UART initialization code present in `usart.c`, generated automatically by STM32Cube tool:

```c
void HAL_UART_MspInit(UART_HandleTypeDef* uartHandle){
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  if(uartHandle->Instance==UART4){
    //
    // ......
    //

    /* UART4 DMA Init */
    /* UART4_RX Init */
    hdma_uart4_rx.Instance = DMA2_Channel3;
    hdma_uart4_rx.Init.Direction = DMA_PERIPH_TO_MEMORY;
    hdma_uart4_rx.Init.PeriphInc = DMA_PINC_DISABLE;
    hdma_uart4_rx.Init.MemInc = DMA_MINC_ENABLE;
    hdma_uart4_rx.Init.PeriphDataAlignment = DMA_PDATAALIGN_BYTE;
    hdma_uart4_rx.Init.MemDataAlignment = DMA_MDATAALIGN_BYTE;
    hdma_uart4_rx.Init.Mode = DMA_CIRCULAR;
    hdma_uart4_rx.Init.Priority = DMA_PRIORITY_LOW;
    if (HAL_DMA_Init(&hdma_uart4_rx) != HAL_OK){
      Error_Handler();
    }

    __HAL_LINKDMA(uartHandle,hdmarx,hdma_uart4_rx);
    //
    // ......
    //
  }
}
```

### Circular buffer and `lineIdle` handler function

At this point most of the magic tricks in this implementation are revealed:
- UART idle line detection
- DMA operating in circular buffer mode

The circular buffer is an useful technique to use on data reception. It allows a continuous cycle of reception and data processing running in parallel. We may say that the buffer will contain two types of data:
- new received data (unprocessed)
- processed data (free space)

The implementation must take care of separating these two kinds of data, to new data may be stored in the free space and the processing function must know how much data is available and where it is.

I won't get too much in detail about circular buffers here since there is a lot of good material about it online. A simple summary of the implementation is:

1. Define the size of the reception buffer
   - it must at least be bigger than the bigger continuous data frame you expect to receive
   - a bigger buffer that fits multiple data frames may reduces the hurry in processing data as soon as it arrives to avoid filling the buffer and overriding data

2. Keep track of two values (or pointers) to control the use of the circular buffer: `head` and `tail`
3. Store a received byte in the position indicated by `head` then increment `head` value
4. Read a byte in the position indicated bu `tail` then increment `tail` value
5. Point `head` or `tail` to the beginning of buffer when each one of them get there
6. Take care of edge cases when valid data is split between the end of the start of buffer (`tail > head`)
7. Update control values on `lineIdle` callback
8. Use `head`, `tail` and buffer size to calculate amount of data available
9. Avoid at all costs not processing the received data fast enough, the status variables will get to an unstable state and and data will get overridden

In the IRQ implementation for UART4 shown above, I'm passing the value `huart4.hdmarx->Instance->CNDTR` as a parameter for the `lineIdle` callback. This value is required to identify the head position since the DMA is continuously copying received bytes to the circular and this callback is the better place to take a look at this information.

These are a few examples of head and tail behavior on circular buffer reception:

```sh
# Empty buffer
 0 1 2 3 4 5 6 7 8 9
| | | | | | | | | | |
 ├─head
 └─tail

# 5 bytes on buffer
 0 1 2 3 4 5 6 7 8 9
|x|x|x|x|x| | | | | |
 │         └─head
 └─tail

# 5 bytes on wrapped buffer
 0 1 2 3 4 5 6 7 8 9
|x|x| | | | | |x|x|x|
     └─head    │
               └─tail

# Full buffer
 0 1 2 3 4 5 6 7 8 9
|x|x|x|x|x|x| |x|x|x|
             │ └─tail
             └─head
```

Here I'm considering that a full buffer actually contains one byte less than its size. That is a implementation choice that may not matter much but it must be take in consideration to avoid confusion with an empty buffer.


## Optional callbacks

There are some callbacks provided by the HAL UART implementation that may be useful in special cases. Their names are descriptive so take a better look if they seem to cover something you need.

```c
void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *huart)
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
```

Implementing a reset of the reception system in the error callback is probably a good idea, since it is called when something wrong happened and the RX has probably been stopped.


## Applying TDD in this implementation

Applying TDD to HAL libraries is not usually very friendly since they are closely attached to microcontroller peripherals and memory addresses that may not be useful while running tests in the development system. Complementary libraries like the one the I've started to implement here for a UART Driver are the opposite to that, after running some tests and defining the desired functions and their responsibilities, it is recommended to implement them following the TDD procedure.

Create test cases for data reception, data consumption, querying available data, forcing a full buffer and checking what happens, same thing for an empty buffer. There is space for a discussion about what relation between `tail` and `head` values defines a full buffer, since both pointing to the same position may create confusion in relation to an empty buffer. Tis aspect should for sure be covered by tests.


The implementations presented in this article are available in the `bugfree_robot` repository, at [this commit](https://github.com/matheusmbar/bugfree_robot/tree/18a2df52659d4ecf00bf2c497517bf941ffb8a81). I recommend caution on using the code directly since it was not completely tested in the hardware to make sure that all calculations regarding the circular buffer are correct.