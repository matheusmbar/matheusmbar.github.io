---
layout: post
title: embedded firmware from scratch - part 1
categories: [tools]
tags: [embedded, programming, toolchain]
comments: true
footnote: "Ever though about not openning the IDE to develop firmware?"
---

Starting a new firmware development project requires multiple decisions, even after the microcontroller and hardware are already selected. One of the first steps is defining the development environment, that in my conception includes:
- code versioning system (git)
- language (C or C++)
- toolchain (compiler, linker, assembler)
- build system (shell, make, ninja, CMake)
- debugger

For many years I've let the microcontroller vendor's IDE take care of most of these decisions. Now I've decided to challenge myself and create a new firmware project from scratch, without using an IDE, in order to learn what takes to make everything work together. This has required learning about multiple tools and the workflow to combine their functions.

This is the **first article** about this endeavor, focusing on a few obstacles that arise due using vendor tools (IDE, toolchain, libraries, etc) instead of assuming full control of your project and setting it up from scratch.

<!--more-->

# Vendor tools and their Magic wizards

Using the **New Project Wizard** in a IDE takes of a lot of the burden of creating a new project and setting up everything until it works together correctly. It is in my opinion the best choice in many cases, maybe the only one for beginners and intermediate level developers.

Programming for embedded systems usually means crafting **everything** that the microcontroller requires to run, and that means **a lot**. Nothing comes for free and mistakes in small details may result in nothing working (the famous hard fault).

Taking the IDE path means accepting multiple non-negotiable choices that it has made. As the project advances, the IDE gets updated (or not) and other factors pile up, these limitations may start to bother and become obstacles.

I'm using "IDE" and "vendor tools" as generic terms here, there are many of them around. They are commonly based in [Eclipse](https://en.wikipedia.org/wiki/Eclipse_(software)) or [Netbeans](https://netbeans.apache.org/), customized with some specialized tools:
- toolchain
- project creation wizards
- startup code generators
- libraries
- programmer/debugger
- static analyzers

Getting all these tools together, (hopefully) tailored to work painlessly with the firmware target in your development workflow may be great and a time saver. In the last years I've used a several IDEs for multiple projects, including: STM32CubeIDE, Atmel Studio, PlatformIO, Code Composer Studio and MPLAB X IDE.

# IDE approach limitations
Unfortunately an IDE usually does not work perfectly. The basic cycle "code, compile, program and debug" will become annoying really fast when any tool starts to misbehave. Examples of this scenario are probably in the memory of slightly experienced developers, those days where the development environment does not seem to do what you want it too, even after restarting it, changing configs and reinstalling software.

Many of there problems get more serious and inconvenient on bigger projects, with multiple developers, dependencies, test and build pipelines. I intend to deal with a few of them with this "project from scratch" approach, so a basic description of each one follows.

## Project configurations

Creating a new project and configuring it through menus on an IDE may seem easy. But sometimes it is really hard to find the correct place to put something like build flags, include paths and other customizations. Another aspects of it are:
- where is all this setup saved ?
- how to keep track of changes as the project evolves ?
- why is there a absolute path from John's host machine doing in my build logs ?

Eclipse based IDEs store this data on hidden files like `.project` and `.cproject`, take a look on them if you've never done it. These files are a complete mess, structured as XML.

These are the first 10 (of 185) lines from the `.cproject` of a STM32CubeIDE project:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<?fileVersion 4.0.0?><cproject storage_type_id="org.eclipse.cdt.core.XmlProjectDescriptionStorage">
  <storageModule moduleId="org.eclipse.cdt.core.settings">
    <cconfiguration id="com.st.stm32cube.ide.mcu.gnu.managedbuild.config.exe.debug.964737329">
      <storageModule buildSystemId="org.eclipse.cdt.managedbuilder.core.configurationDataProvider" id="com.st.stm32cube.ide.mcu.gnu.managedbuild.config.exe.debug.964737329" moduleId="org.eclipse.cdt.core.settings" name="Debug">
        <externalSettings/>
        <extensions>
          <extension id="org.eclipse.cdt.core.ELF" point="org.eclipse.cdt.core.BinaryParser"/>
          <extension id="org.eclipse.cdt.core.GASErrorParser" point="org.eclipse.cdt.core.ErrorParser"/>
          <extension id="org.eclipse.cdt.core.GmakeErrorParser" point="org.eclipse.cdt.core.ErrorParser"/>
```
It only gets worse after this. There is one line with 1020 characters.

And guess what, these files change by themselves sometimes, updating the software version, some timestamp, etc. It is really hard to keep track of what is going on so the natural consequence is removing them from version control or just accepting and commiting any changes.

## Build configurations
This is an extension to last subject that deserves a highlight due its impact in the development workflow.

A project usually contains at least two build configurations: release and debug. They will differ on optimization flags, debug features, a few defines to change print behavior, and many other options as required. IDE projects will store this precious information inside all that mess of project configuration files.

These are two lines (line breaks added for clarity) in the `.cproject` that selects debug level and optimization level for the "Debug" build configuration :
```xml
<option
id="com.st.stm32cube.ide.mcu.gnu.managedbuild.tool.c.compiler.option.debuglevel.1538227319"
superClass="com.st.stm32cube.ide.mcu.gnu.managedbuild.tool.c.compiler.option.debuglevel"
useByScannerDiscovery="false"
value="com.st.stm32cube.ide.mcu.gnu.managedbuild.tool.c.compiler.option.debuglevel.value.g3"
valueType="enumerated"/>

<option
id="com.st.stm32cube.ide.mcu.gnu.managedbuild.tool.c.compiler.option.optimization.level.1466059642"
superClass="com.st.stm32cube.ide.mcu.gnu.managedbuild.tool.c.compiler.option.optimization.level"
useByScannerDiscovery="false"/>
```

I believe all this will result in `"-g3 -o0"` added to compile commands. Good luck trying to extract all the build options from there without using the software that created it.

## Toolchain and build procedure

Vendor IDEs usually include the toolchain required to build code for their microcontrollers. Which version of it? The one they've chosen for you. It's usually possible to select the version among a list of supported ones or even another one like the main gnu-arm-toolchain. Change this on your own responsibility

Commercial projects will probably lock toolchain version for better stability on the long term. Storing the installer and binaries for these tools gets as important as versioning the code, helping on reproducible builds and maintaining known behaviors.

Toolchain changes and upgrades later in a project lifetime becomes rare, executed only if new resources are required (as supporting a new C++ standard or target platform). This event should trigger execution of deeper functional and regression tests, that require more time and effort. In case you are using an IDE for a big project, it may be a good idea to store its installer in order to keep this version always available to install when needed in the future.

## External dependencies

Beginner and smaller projects are self contained most times, so a single firmware project and repository will hold all the code required to run the application. Professional projects for complex products will probably extract parts of the implementation to dedicated repositories, like a libraries that only deal with sensor peripherals or communication protocols and interfaces. This helps code reuse and compatible APIs between multiple applications that interface between themselves.

So on top of everything highlighted before, it brings the need to setup a project that needs code from multiple repositories, compile all the libraries as well as their dependencies, and compile the toplevel firmware linking it with all that. And to make it worse some library may require a small tweak to work when used in one project but it does not for another one.

This is one of the hardest problems to solve due its complexity level. Setting up a project from scratch like the one I'm doing will not solve this problem, although for me it is the way to start tackling it.  More resourceful build organizers like CMake may help on this task.

Insisting in put a project with multiple dependencies to work with an IDE may be possible and even shown on vendor example projects, but keep in mind that it will increase complexity and difficult  exponentially, as the chance of hitting a dead end where it won't allow you to finish the task.

## Code editor and OS preference

As developers, we like the freedom to choose the code editor to work with, and this choice may vary much even for a small team, even more after tens of developers are working together, time passes, new software becomes available and older ones stop to support the latest operational systems.

And there is the operational system problem too, mixing developers that work on host machines running Linux, MacOS and Windows. An IDE may not support all of them, present divergent behaviors while working on the same project on different OS and even require changes in the project configuration files when changing OS.

Eclipse has worked on Linux for a long time now, but the vendor customizations and complementary tools to run as an embedded IDE must support the operational system as well. This is completely absent for some tools, e.g. Microchip Studio (former Atmel Studio).

Decoupling project setup and build setup from the code editor allows a free choice of development environment, without impacts in the project configuration. Each developer gets free choice for the environment setup, with infinite options on the table: VS Code, Vim, Emacs, Eclipse, Notepad++, Linux, MacOS, Windows, GDB on terminal, GDB on a graphical tool. This impacts a lot on confidence and efficiency in a daily basis.

## DevOps

A good [DevOps](https://en.wikipedia.org/wiki/DevOps) setup with automation pipelines helps a lot the development workflow and overall quality of the results. It usually includes:
- compilation/execution of unit and integration tests
- static code analysis
- preparation of deploy artifacts

A consistent pipeline should present itself as the Single Source of Truth in the project. So all builds and tests must work there as expected, it is to be trusted more than any local builds.

Projects that depend on a IDE to compile are close to impossible to integrate in a full automated build pipeline. Almost all points highlighted in this article play some part here.

An IDE that is exclusive (or works better) in a specific OS will require the same one to be used in the automation pipeline.

User intervention is required to trigger builds. Try to ask the IT responsible to create a pipeline with a point and click tool included.

Resources like a `Makefile` are created by these tools when a build is started, so they are not available when the pipeline fetches the code from a repository. It is not possible to create them without the IDE and they may contain absolute paths that are tailored to the host machine (so commit a `Makefile` that works locally won't allow it to run in a DevOps instance).

# Conclusion

The idea for this article wasn't a full rant against IDEs (although it may have become close to this). As stated at its beginning, there is for sure a place for IDEs and their projects in the embedded world, as well as in the learning tool of a developer. Apart from that, for many projects the drawbacks on this approach will start to overcome the benefits as the complexity and team size increases.

Setting up the project from scratch has forced me to learn a lot more about what makes some code run in the microcontroller. It brings many challenges while removing resources like vendor provided peripheral libraries, linker file and startup code, that must be replaced to obtain a fully functional firmware.

In the next article (*already available [here]()*) I'll show and explain the required steps. There will be a lot of code and low level details.
