---
layout: post
title: setup Cpputest framework
categories: [bugfree-robot]
tags: [TDD, programming, git, bash]
comments: true
footnote: Submodules give you repository super powers!
---

The [last post]({{ site.baseurl }}{% post_url 2019-02-25-what_is_tdd %}) showed an example of coding and running tests with Cpputest, without revealing the ugly part of putting it to work. It is now time to reveal those secrets by explaining how to set a project with Cpputest, code and run the tests. Open you terminal and get ready to run commands on it!

The way I'm used to build projects with TDD is including the Cpputest inside the project directory, it helps on setting the build environment and replicating it consistently along the development team. I recommend it even for one man projects so it works the same way in both situations. 

I strongly recommend creating a repository on [Github](https://github.com/) or [Gitlab](https://gitlab.com/) to host you project. It will allow a future step of running a continuous integration build server, that will check every commit executed for failures on the tests. More on that in a future post (EDIT from the future: check it [here]({{ site.baseurl }}{% post_url 2019-10-09-setting_up_build_server %}) after reading this one). 

<!--more--> 

PS: If you are not familiar with working on `git` repositories, take some time **NOW** to learn it. Code version control is extremely required for coding jobs. There is a lot of material about that online (GOOGLE IT :stuck_out_tongue_winking_eye:) so it is not my priority explaining it in details here. I'll try to give some tips and details when using `git` commands but let me know in the comments below if you are interested on a post dedicated to this matter. 

## Prepare build tools

This process will be described to run inside a **Linux** terminal and it not tested by me on any other Operational Systems. **MAC OS**should run without any additional setup requirements, since it is pretty similar to Linux on its guts. **Windows** takes some more work and I recommend installing [Cygwin](https://www.cygwin.com/) with some packages (`gcc`, `gcc-g++`, `make`, `git`) then execute the Cygwin terminal to run the commands. 

Linux distributions usually already provide C and C++ build commands and don't provide the Git command, so look for how to install it in your system. 

Test some commands to make sure that your terminal is ready to run the C and C++ build commands. Just type them and press ENTER. They are:

```bash
gcc --version
g++ --version
make --version
git --version
autoreconf --version
libtool --version
```

No command shall return `command not found`. Check the if the messages are similar to mine listed below:

```bash
$ gcc --version
gcc (Ubuntu 8.2.0-7ubuntu1) 8.2.0
Copyright (C) 2018 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

```bash
$ g++ --version
g++ (Ubuntu 8.2.0-7ubuntu1) 8.2.0
Copyright (C) 2018 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

```bash
$ make --version
GNU Make 4.2.1
Built for x86_64-pc-linux-gnu
Copyright (C) 1988-2016 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
```

```bash
$ git --version
git version 2.19.1
```

```bash
$ autoreconf --version
autoreconf (GNU Autoconf) 2.69
Copyright (C) 2012 Free Software Foundation, Inc.
License GPLv3+/Autoconf: GNU GPL version 3 or later
<http://gnu.org/licenses/gpl.html>, <http://gnu.org/licenses/exceptions.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Written by David J. MacKenzie and Akim Demaille.
```

```bash
$ libtool --version
libtool (GNU libtool) 2.4.6
Written by Gordon Matzigkeit, 1996

Copyright (C) 2014 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

In Ubuntu `libtool` is installed through `sudo apt install libtool` but it comes without an easy way to check if it is installed and its version. I've installed `libtool-bin` so the above command works.  

Take your time to make all of them work since there is no point in trying to execute the next steps otherwise. 

## Add Cpputest source code to project

The beginning of this process goes with two paths, one for running inside a git repository and another one without it. Open your terminal and follow the one that applies to you. The rest of the process will work no matter where you are running it. 

### Running without a git repository

The first step is creating your working directory and opening it. Let's do it in the command line since it is already open:

```bash
mkdir bugfree_robot
cd bugfree_robot
```

A folder dedicated to the test files is recommended to keep everything organized:

```bash
mkdir test
cd test
```

It is now time to obtain the Cpputest files from its [Github repository](https://github.com/cpputest/cpputest):

```bash
git clone https://github.com/cpputest/cpputest
cd cpputest
ls
```

This last command will show all the files present on Cpputest repository and is the end of this section. Jump to **Building CPputest**


### Running with a git repository

The first step is cloning your repository and opening it. I'm showing the command with the `bugfree_robot` repository but remember to adapt it to your own repository path.

```bash
git clone https://github.com/matheusmbar/bugfree_robot.git
cd bugfree_robot
```

A folder dedicated to the test files is recommended to keep everything organized:

```bash
mkdir test
```

We could just clone the whole Cpputest repository inside our repository but it is not recommended, since we don't want to modify and version them. The tool for this situation is called `submodule`, that includes another git repository as a dependency inside another repository. The Cpputest code will be locked at its most recent version at this time and won't update without user request. 

Run the following command inside the repository folder to add Cpputest as a module. Expect to find some file download progress action and a `done` in the last line.

```bash
git submodule add https://github.com/cpputest/cpputest test/cpputest/
```

Check that Cpputest files got downloaded. 

```bash
ls test/cpputest
```

No need to pay much attention to the filenames, just check that there are tens of them (something around 40 ~ 50) and go to the next section. In some cases the submodule files may not be initialized automatically (as when you clone the repository in another workstation), it is simple to solve:

```bash
# go inside submodule folder
cd test/cpputest
git submodule update --init
# check that the files are present now
ls
```

## Build Cpputest

At this point you shall have a project directory tree with the folders as show below (running with or without a git repository):

```
bugfree_robot
|-- test
|    |-- cpputest 
|    |    |-- build
|    |    |-- include
|    |    |-- (...)
|    |    |-- many other Cpputest folders and files
```

Cpputest will be used as a software library when compiling our tests so it will not be compiled every time the tests are build, but just once. This results in a much faster build process later. The cloned files include scripts to build it easily. Check that each command executed correctly before going to the next one. It goes with the following commands (and takes a few minutes usually):

```bash
cd test/cpputest
./autogen.sh
./configure
make
```

The `make` command prints A LOT of text in the terminal. It is normal to get confused if it finished correctly or not. An easy way to check it is looking for the lib files that are created as its output running `ls lib/`, that must return:

```
libCppUTest.a  libCppUTestExt.a
```

Finding those indicates that Cpputest is ready to build and execute the tests. The next part of this process is creating a Makefile for our test environment and our first test source codes. This will go on the next post. 

----

I've done some `git black magic` to reorganize the `bugfree-robot` commits time line since the original publication of this post so now there is a commit that reflects the stage we are at the end of this article. You can check it at [bugfree-robot/added cpputest as submodule](https://github.com/matheusmbar/bugfree_robot/tree/d0d0abeb7c290deed7bb94871421e102b99f0cf4).