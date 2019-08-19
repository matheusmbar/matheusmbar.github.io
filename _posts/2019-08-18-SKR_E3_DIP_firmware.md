---
layout: post
title: Upgrading Ender 3 controller board
categories: [3D Printer]
tags: [Ender 3, embedded, Marlin]
comments: true
footnote: 3D printer silence is pure magic!
---

Apart from developing embedded firmware and hardware I've been spending many hours improving and printing with an Ender 3 3D printer bought last year. This low cost printer is able to deliver awesome results fed by patience, dedication to dig through YouTube tutorials and forum posts and installing some mechanical and electronics improvements. Many failed prints will be in the process too. 

Getting my printer to work as good as it can is an ongoing project in the last months since it arrived from China, starting by its assembly. I've executed many changes and improvements on it is this process and by naming a few of them:

- Printed a back cover for the LCD console
- Added a fan guard to the electronics fan (avoiding filament pieces to get through it)
- Replaced original PTFE bowden tube with an original Capricorn
- Added a few LEDs to light its printing bed
- Replaced original print cooling fan and fan duct to allow better view of the nozzle as it prints and improve air flow
- Updated Marlin firmware in the original Creality Melzi PCB controller to get rid of known fixed bugs and add new resources
- Added manual mesh bed leveling to firmware

<!--more-->



The heart of any 3D printer is its controller PCB that includes a microcontroller, stepper motor drivers, power MOSFETs to provide current for the hot end and heated bed, inputs for thermistors and end stop sensors, USB, LCD and SD Card connections. A great majority of the printers in the market (mainly the ones based in the RepRap project as the Ender 3) run [Marlin Firmware](http://marlinfw.org/), a great open source project with a big community of developers and users that work to make it compatible with a multitude of PCB boards, printers and custom setups. The source code is available in its [GitHub repository](https://github.com/MarlinFirmware/Marlin).

## Update reasons

The main reason for this post is documenting the process of my latest upgrade that was replacing the original PCB controller board with [BIGTREETECH SKR E3 DIP V1.0](aliexpress.com/item/33052767749.html). There were two main motivations for it:

1. getting a most capable/faster microcontroller running the PCB, what can result in better prints and firmware space for additional Marlin features
2. replacing the original A4988 motor drivers with better ones from Trinamic as the TMC2208

It turns out that most of the noises that a 3D printer is due to outdated motor stepper drivers as show by Teaching Tech at [this upgrade tutorial and comparison](https://youtu.be/7VHwcEroHPk?t=1109). Having the printer sitting in my office gets annoying some after time of it printing and buzzing in the room. Trinamic develops many drivers with the ability to drive the motors in a silent way, between many other resources though the stepper drivers family. 

## Choosing the SKR E3 DIP

> Before going any further, I'd like to let clear that I have no direct connections to BIGTREETECH or any of its collaborators. This article is not sponsored in any way. 
>  
> I have no access to any privileged information about the company, its products, firmware and support procedures. 
> 
> The information compiled here is the result of my research, trials, errors ans successes

The Melzi PCB that came with my Ender 3 has onboard A4988 drivers so it is impossible to update just the drivers. They already provide a new version that comes with Trinami drivers but it wouldn't fulfill reason #1 for my upgrade as the ATmega1284 8-bit microcontroller is still there. Bigtreetech is a chinese manufacturer that designs products for 3D printers and I think the most famous at this point in time is [SKR 1.3](https://www.aliexpress.com/item/32981807406.html). It comes with a Cortex-M3 processor, many resources as removable drivers and extra pins for custom features. It could fit in my printer but would require a lot of work to connect everything back since some connectors are not as in the Melzi PCB and the TMC2208 drivers require additional connections not present in the PCB (so they would go through several wire jumpers).

Around the time I was running this research to choose the new heart for this printer Bigtreetech have announced a new product: SKR E3 DIP v1.0. This is intended as a plug and play replacement for the original PCB board on the Ender 3. It comes with a STM32F103 microcontroller and has all parts almost in the same place, including mounting holes, mini USB, SD Card, motor outputs, end stop connections, heated bed and hot end connectors. I've selected a kit with the SKR E3 DIP and four TMC2208 drivers in AliExpress and waited a month for its arrival. 

## Digging information about the firmware and the PCB

Despite the (some times confusing) effort from Bigtreetech to keep good documentation for its products, it is not so easy to find out how to setup the firmware for this PCB since it is a brand new PCB. The first thing I've done when the kit arrived was connecting it to my laptop and checking that it showed up as a USB serial port in Linux, what it did as expected. 

> The second thing was realizing that it came with a SD card with 128MB of capacity. 
> 
> What the hell ? Are those still manufactured?

Bigtreetech keeps a [GitHub repository](https://github.com/bigtreetech/BIGTREETECH-SKR-E3-DIP-V1.0/) to document this PCB. It contains a copy of Marlin firmware (at some unknown commit) that has been adjusted to work in the board besides four compiled firmware binary files:

```
- firmware_tmc2130_chip_on_bottom.bin 
- firmware_tmc2130_chip_on_top.bin    
- firmware_tmc2208_chip_on_bottom.bin
- firmware_tmc2208_chip_on_top.bin
```

I know I need one with `tmc2208` in the name, but between `top` and `down`? Not a slightest idea, and there is nowhere telling the difference between those. The repository's `firmware\README.md` has almost no useful and clear info about configuring the original Marlin firmware for this PCB (and what it tries to say is outdated at this point). Trying to bring their repository changes to the original Marlin firmware got me many build errors since their `platformio.ini` file has many differences.

I've cloned the full repository in the computer, copied one of those `tmc2208` firmware binaries to the SD card, renamed it to `firmware.bin`, inserted it in the board and watched it update its firmware on boot. 

The TMC2208 drivers require shorting a few pads to connect the UART pins to the pin header. [This instructable](https://www.instructables.com/id/TMC2208-UART-on-BigTreeTechBIQU-SKR-V11-and-V13-Co/) has a great description about executing this at `Step 1: Modify Your Driver Modules...maybe`. This PCB removes the need for any external wiring so all other steps on the guide may be ignored.

I've set the jumpers as indicated in `SKR E3 DIP V1.0 Manual.pdf` (inside the repository) to work with the TMC2208 in UART mode and inserted one of the drivers in the PCB. Sending `M122` gcode to the board at this moment returns information about the Trinamic motor drivers, at least it should. The answer from the board showed that no driver was connected. Long history short (that took me a whole day to find out): the drivers won't communicate if the board is powered just from the USB connector, they need the 24V input connected. All 4 drivers communicated correctly after this.


## Setting Marlin firmware from scratch (it is actually easy)

As an embedded developer I always prefer to setup as most as I can manually when building Marlin firmware. After compiling the Marlin firmware version from Bigtreetech's repository, trying to configure a few months old original Marlin firmware and recently cloned original Marlin firmware a few times, while comparing everything that is changed in their repository, I've come to a simple recipe on how to do it properly.

The main tip is completely ignoring the Firmware folder from [BIGTREETECH-SKR-E3-DIP-V1.0 GitHub repository](https://github.com/bigtreetech/BIGTREETECH-SKR-E3-DIP-V1.0/). The only useful info there is the hardware related PDFs and images. 

Get the newest version of Marlin Firmware at its [GitHub repository on branch `bugfix-2.0.x`](https://github.com/MarlinFirmware/Marlin/tree/bugfix-2.0.x). Go to `Clone or download` or just [click here](https://github.com/MarlinFirmware/Marlin/archive/bugfix-2.0.x.zip). Unzip this folder and open it on VSCode with PlatformIO (look for Marlin tutorials/documentation on how to setup it if this is your first time doing it).

There are only 3 files that require changes for this to work, I'll go trough each one of them next. 

### `platformio.ini`

This file defines what will be compiled and how it will be done by PlatformIO. There is only one change required and it is right in the start of the file. Set `default_envs` to:
```
default_envs = BIGTREE_SKR_MINI
```

Since many ones questioned me about this, let me be it very clear about this file. This instruction section from [BIGTREETECH-SKR-E3-DIP-V1.0 firmware repository](https://github.com/bigtreetech/BIGTREETECH-SKR-E3-DIP-V1.0/tree/master/Firmware) (sorry BTT but i had to fix some English mistakes in your instructions):

>  If you have downloaded from Marlin bugfix-2.0.x Official version please modify here from `TMCStepper@<1.0.0` to `https://github.com/bigtreetech/TMCStepper`

This change is not required anymore. The line I've showed above is the only one I've changed in `platformio.ini`.

### `Marlin/Configuration.h`

This is the file that holds configurations about the printer, the controller PCB and most of Marlin features. There are a lot of changes so I will only indicate the parameters that I've set. Look for them in the file and replace with what I list here. 

```
#define SERIAL_PORT -1
#define SERIAL_PORT_2 2
#define MOTHERBOARD BOARD_BIGTREE_SKR_E3_DIP
#define CUSTOM_MACHINE_NAME "Ender-3"
#define DEFAULT_NOMINAL_FILAMENT_DIA 1.75
#define TEMP_SENSOR_BED 1
#define BED_MAXTEMP 125
#define DEFAULT_AXIS_STEPS_PER_UNIT   { 80, 80, 400, 93 }
#define DEFAULT_MAX_FEEDRATE          { 500, 500, 5, 50 }
#define INVERT_Y_DIR false
#define INVERT_Z_DIR true
#define X_BED_SIZE 235
#define Y_BED_SIZE 235
#define Z_MAX_POS 250
#define HOMING_FEEDRATE_XY (40*60)
#define DISPLAY_CHARSET_HD44780 WESTERN
#define SDSUPPORT
#define CR10_STOCKDISPLAY
```

Comment these lines (add `//` to line beginning:
```
  // Ultimaker
  //#define DEFAULT_Kp 22.2
  //#define DEFAULT_Ki 1.08
  //#define DEFAULT_Kd 114
```

Add these lines (right next the the other ones is recommended):
```
  // Creality Ender-3
  #define DEFAULT_Kp 21.73
  #define DEFAULT_Ki 1.54
  #define DEFAULT_Kd 76.55
```

The `DRIVER_TYPE` defines are commented by default. Just uncomment the lines for: X, Y, Z and E0 and set its values to the driver you are using. In my case TMC2208s:
```
#define X_DRIVER_TYPE  TMC2208
#define Y_DRIVER_TYPE  TMC2208
#define Z_DRIVER_TYPE  TMC2208
#define E0_DRIVER_TYPE TMC2208
```

This is the end of the required changes in this file to put the board to work. I've made some additional personal changes to add the PID tune to the LCD menu and set preheat parameters for PLA and ABS:
```
#define PID_EDIT_MENU
#define PID_AUTOTUNE_MENU
#define PREHEAT_1_TEMP_HOTEND 205
#define PREHEAT_1_TEMP_BED     60
#define PREHEAT_1_FAN_SPEED   255 // Value from 0 to 255
#define PREHEAT_2_FAN_SPEED   255 // Value from 0 to 255
```

Mesh bed leveling is the best feature I've find to hel in first layer adhesion. My printer bed has a pronounced unleveling in its center and this technique can compensate that without requiring any additional sensor. These changes are required in this file to make it work:
```
#define PROBE_MANUALLY
#define MESH_BED_LEVELING
#define RESTORE_LEVELING_AFTER_G28
#define MESH_INSET 35
#define EEPROM_SETTINGS
#define EEPROM_AUTO_INIT
```

The last two lines enable the EEPROM emulation in the firmware. It will create a `.dat` file in the SD Card and use it to store configurations as the mesh bed leveling calibration heights.

### `Marlin/Configuration_adv.h`

There is only one change in this file that I'd list as required if using Trinamic drivers, uncomment this line:
```
#define TMC_DEBUG
```

I have some personal changes listed below that I recommend analysing if they make sense to you or not. They are basically uncomment lines:
```
#define QUICK_HOME

#define LCD_INFO_MENU
#define STATUS_MESSAGE_SCROLLING
#define SCROLL_LONG_FILENAMES
#define BABYSTEPPING
#define DOUBLECLICK_FOR_Z_BABYSTEPPING
```

### Building the firmware

Save all the changed files and build the firmware (click in the  :heavy_check_mark: at the bottom left). Check the TERMINAL log for any errors (red lines). There will be many warning (yellow lines) but just ignore them. The crucial part is making sure that this line is shown:
```
Environment BIGTREE_SKR_MINI            [SUCCESS]
```

The next step is going to the folder `Marlin/.pioenvs/BIGTREE_SKR_MINI` and copying the file `firmware.bin` to the SD Card (this name must be kept). Insert the SD card  in the board and power cycle it. The BLUE LED will blink while the firmware is updating. The board will boot up after the update is finished. I recommend removing the SD card from the printer at this moment and renaming the `firmware.bin` file to something like `firmware_current.bin` so the PCB won't run the update every time it boots up.

This procedure will be the same for updating the firmware in the future to make changes in parameters and features. I recommend not deleting the `firmware_current.bin` from the previous update before checking that everything is working as expected so there is an easy backup to run to if something foes south.

## Installing the PCB

This step takes some time but is pretty straightforward. The only annoying aspect is the small space to work on and the cables that are only as long as they are required to be. Just check if all cables are labeled correctly and add labels to the ones that are not. Disconnect them carefully and free the PCB from all wires and screws. Place the SKR E3 DIP and execute the reverse process, holding it with the screws, connecting the power cables (always pay attention to polarity of the main 24V input and the PCB board cooling fan), motors, end stops, thermistors, hot end and heated bed. 

One mistake I made was misinserting the hot end cable under the correct place in the connector. It looked like correctly connected when checked from over it. When testing the hot end heating for the first time I've started to see some smoke coming from the PCB and turned its power off right way. It turns out the misconnection as resulting in the wire heating inside the connector and starting to melt it. No serious damage due that and easily fixed at that point but it is the kind of thing that could result in a fire if not detected.


## Closing thoughts

It took some time for me to understand that the Bigtreetech Marlin firmware was pretty outdated from the Marlin official repository. Their documentation is not well organized since most info is lost in answers in their Facebook groups ([SKR MINI E3&E3 DIP](https://www.facebook.com/groups/322956191976815/) and [BIGTREETECH](https://www.facebook.com/groups/505736576548648), messages in private support and reddit posts. 

This article is my contribution to organizing all the info I define as required on putting this PCB to work as a drop in replacement for the original Melzi PCB in the Ender 3 printer. 

I've read many reports about problems with the board malfunctioning or not working with BL Touch sensors. I can't comment anything about it since mine is working great since I got it. The only problem detected is that the hod end thermistor reads incorrectly when the board is powered by the USB before the main power input but this is listed in Marling issues so doesn't seem like a hardware problem. 

I'm letting available my modified files. Feel free to download them and compare with yours or simply using them to put your PCB to work. 

- [`platformio.ini`](/assets/files/2019-08-18/platformio.ini)
- [`Marlin/Configuration.h`](/assets/files/2019-08-18/Configuration.h)
- [`Marlin/Configuration_adv.h`](/assets/files/2019-08-18/Configuration_adv.h)

> PS: I've messed up about where the correct Marlin firmware files were in my laptop and uploaded the wrong files here in the first publication of this article (at August 18th 2019). 
> 
> Please use the new ones (uploaded at August 19th 2019), the only ones available now, so no chance of getting the wrong ones.