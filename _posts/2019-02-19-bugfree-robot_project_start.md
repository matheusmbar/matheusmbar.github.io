---
layout: post
title: bugfree-robot project start
categories: [bugfree-robot]
tags: [TDD, embedded, programming]
comments: true
footnote: This is just the beginning
---
This post is the start of a new personal/educational project that motivated me to start this blog. It's will be developed as kind of tutorial, guidance and general tips/tricks about coding for embedded systems using Test Driven Development (TDD) and some other techniques. 

I've being coding microcontrolers for several years and it can be really challenging due to many reasons like:
- define what is is supposed to execute
- model the system's architecture so it is able to run all its tasks
- make sure it wont't fail while running... 
- it WILL fail sometime, so make sure that is is able to recover from failures (_gracefully_ as they use to say)
- check if all the functions are behvaing as correctly by themselves and inside the full firmware
- understand and control correctly the microcontroller peripherals and the other components on the hardware
- be able to add features and change behaviors in the system and many times they will require big changes in the way other parts or it are planned and coded
- (add here your own frustrations, there are many more on the road)

<!--more-->

After getting in contact with some high level programming workflows, with its unitary and integration tests, automated continuous integration and continuous deployment tools, I've started to look for a way to improve my own embeded development workflow. 

At some point the book **Test-Driven Development for Embedded C** _by James W. Grenning_ showed up on my searches and caught my attention. At some online store, it has this catchy description:

> Still chasing bugs and watching your code deteriorate? Think TDD is only for desktop or web apps? It’s not: TDD is for you, the embedded C programmer. TDD helps you prevent defects and build software with a long useful life. This is the first book to teach the hows and whys of TDD for C programmers.

Totally captivating right? So I've decided to git it a try and don't regreat it for a moment. 

My journey started with reading it from start to finish (_there are some exercises recommended to be executed on each chapter but I've just jumped them, think about executing them if this method works best for your learning cycle_) and creating a small sample project to test it out. It IS NOT this project. The first one was really confusing and clogged with useless functions that had the learning process as the only reason to exist, functions that checked if an IO pin was already initialized, others that read the ping and saved its logic level in a data structure on RAM for no one to consult, so many overhead on everything. This first project is laying forgotten in some private repository never to be recovered. 

At this time a new project was starting at my job and I've decided to execute at least part of it applying TDD. Its core was about communicating through UART with an external radio module with AT commands and compressing data in the payload. The development of the data insertion on the payload being verified by the tests made me alot more confident that everything was running as expected at the end, and helped me identify many mistakes in codes that I was sure that were built carefully and that would work correctly. And the surprising part: most of it were coded and verified without even openning the microcontrollers development IDE, firing its compiler neither opening some debugging session with its programmer. Crazy right? But it is possible, while saving a lot of time and headache. 

### What is this project about
This article got a bit bigger than expected but it can't end without a properly introduction to what this project is supposed to be. 

I'm going to develop the firmware from scratch for a robotics project of mine. This wiki will be used as a progress blog, sometimes describing technical stuff about how to put the test environment to work, create unitary and integration tests, make-build-test-repeat, design system's architecture and other times talking about the robot itself, its taks and the algorithms implemented for it. 

The idea is giving a strong base for those who want to improve as embedded programmers through passing on some practices that are helping me improve in the last (and following) months too. 


The robot's source code will be maintained completely open source in the repository [bugfree-robot](https://github.com/matheusmbar/bugfree_robot). I pretend to post as much as possible about the project development here and always link the GItHub source files and commits that reflects the project status. 

Feel free to comment on the posts with questions, suggestions, compliments, etc.  

The next article will be focused on what is TDD and how it can be applied to embedded systems. 

### Disclaimer: 
I'm in no way related to James W. Grenning or its publisher and this project is developed in my free will, other books (at least one more) will be recomended along the way. That being said, I strongly recommend obtaining a copy of **Test-Driven Development for Embedded C** and starting to study it to understand better the concepts used along this project. 
