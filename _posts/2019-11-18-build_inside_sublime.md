---
layout: post
title: setup build system at Sublime Text Editor
categories: [bugfree-robot]
tags: [bash, TDD, programming]
comments: true
footnote: No more excuses to not build 
---

I'm used to coding in [Sublime Text 3](https://www.sublimetext.com/3) while developing code for the tests and the libraries for my projects. It's a software that provides many smart shortcuts that can get a lot done faster when you get used to them. I know many ones advocate against any kind of visual software for coding and will go hands tied with `vim` until death but I've never gotten there. It may be a good tool after the "getting used to it" period but it never got me into really trying to acquire a relationship. By the way, for those able to read in portuguese, a friend of mine has shared a guide with many pointers in setting up an efficient `vim` working environment, check it out [here](https://danieljunho.com/2019/05/30/vimrc.html).

My standard working setup has a Sublime window open showing the full repository folder tree in the left plus two vertical files open plus a terminal window (in another monitor preferentially) in the test folder so a simple `make` command will build and run my tests. This works pretty well and causes me no problems but one sometimes: building the tests after modifying a few files on sublime but forgetting to save one of them, getting test results that were not expected and taking a few minutes to realize this simple problem. This problem was fixed as a side effect when I've decided to setup a build system inside Sublime to run my tests. 


<!--more-->

The menu "Tools >> Build System" lists a few languages that Sublime is able to build and run by default but I'd say that those default tools won't get you very far. It seams like almost all of them are able to build/run only single files and nothing more complex than this. Creating your own Build System is really easy though, and it is actually already listed in this same menu section as: "New build system". Clicking over this option will give you a new open file with a `.sublime-build` extension and this content:

```js
{
    "shell_cmd": "make"
}
```

Nothing more than the regular Java Script like structure that holds many other Sublime configuration profiles like default indentation procedure, language specific configurations and color syntax profile. It shows a `make` command already but it does not seem possible to be as simple as this, but it is almost that. The only required fix here is forcing this command to run inside the correct folder. In my case it is `bugfree_robot/test` so the first step is getting inside this folder. I'm used to (and recommend doing so) go to "File >> Open Folder..." and selecting my repository folder when working on something. This will show the folder tree in the window's left side section. 


> Small tip: I've hidden the left side bar unwittingly before and had to learn how to get it visible again. There are two paths:
- go to: "View >> Side Bar >> Show Side Bar"
- hold CRTL key, press and release K key, press and release B key, release CTRL key

Opening the folder comes with a bonus: now the repository folder for your project is known by Sublime since it is the folder you told it to open. This is available internally as the tag `$folder`. Editing that `.sublime-build` file to this will get the work done:

```js
{
    "shell_cmd": "cd $folder/test;make -j4"
}
```

This is only moving to the test folder and building/running the tests, exactly what we want while coding and testing. The next step is saving this file. Sublime will automatically show you the correct place to put it, in my case a configuration folder inside my home folder (`~/.config/sublime-text-3/Packages/User/`). Choose a name knowing that it is the one that will show up in the "Build Systems" menu and keep the file extension. It is already available to use after saved. 

Use the "Open Folder" menu to open you project's repository, select the "Build System" you've just created and press "CTRL + B" to build your tests. The build progress and test results will show up in a down side panel. And the bonus side effect: starting a Build like this one will save all open files automatically, avoiding that small problem noted earlier on while building in the terminal.

I've decided to create an additional Build System to execute a `make clean` before building the project, as it is sometimes a good idea to make sure that everything is building correctly and no old built files are being used in the link procedure. Modifying the Makefile may result in a situation like this if a file is not in the build paths anymore but a built object is still available for it. The clean build system is this one (remember to save it with another filename):

```js
{
    "shell_cmd": "cd $folder/test;make clean;make -j4"
}
```

That was everything to explain in this article. I've added these two files in the `bugfree_robot` repository so they are always handy if this must be setup in another machine. There is even a simple bash script to copy them into the right folder. The files are available [here](https://github.com/matheusmbar/bugfree_robot/tree/62e7bcbf42b2c154ff3830d0760c47ef1c9b7f13/tools/sublime3). I've named them as `embeddedCpputest` since they will be visible anytime Sublime is used and I always set my embedded development repositories with tests inside a `test` folder, this allows using the same Build System always. 

