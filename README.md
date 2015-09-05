# node-gimx
Send commands to gimx via js. Currently, only Playstation is supported.  
  
  
#Quickstart  

    var gimx = require('node-gimx');  
    var g = new gimx({
    	path: 'C:\\Program Files\\GIMX\\',
    	host: '127.0.0.1',
    	port: '51914'
    });  
    g.press("cross");  
    
  
#Macros  
Macros are a chainable method of combining multiple commands into a set of instructions. press(), release(), hold(), and wait() are supported.
  
To add a macro:  

    g.macro('test')
      press/wait/hold/release
      .add();
    
To execute a macro:  

    g.macro('test')
      .run()
  
For example, to press left, wait a second, then press right:  

    g.macro('test')
      .press('left').wait(1000)
      .press('right')
      .add()
    
    g.macro('test')
      .run()  
  
Macros can also contain other macros. The following would press left, wait a second, press right, wait a second, press up, wait a second, then press down:  

    g.macro('test1')
      .macro('test').wait(1000)
      .press('up').wait(1000)
      .press('down')
      .add()
    
    g.macro('test1')
      .run()
      
  
A macro can also be repeated:  

    g.macro('test1')
      .run(true)
      

#Events  

    g.on('completed-macro-test', function() {
      //do stuff
    });
    
completed-macro-_name_  
Emitted when a macro named '_name_' has completed 
  
started-macro-_name_  
Emitted when a macro named '_name_' has started  
  
repeated-macro  
Emitted when the top-level macro has started over, given macro.run(true)  
  
send-success  
Emitted when a command is successfully sent to gimx  
  
send-failure  
Emitted when a command fails to be sent to gimx
  
#Options  
path - string, path to gimx.exe  
host - string, host of remote gimx  
port - string, port of remote gimx  
debug - boolean, prevents sending calls to gimx
  
  
#Methods  
Macro(name)  
string name - name of the macro  
  
Add()  
*To be chained with macro()
  
Run(repeat)  
boolean repeat - if set to true, repeats the macro after finishing  
*To be chained with macro()

Stop()  
Stops all running macros and clears the action queue
*To be chained with macro()
  
Press(button, pressure)  
string button - a valid button  
optional number pressure - a number from 0 to 1 representing how far down the button is pushed. Defaults to 1.  
*A press call automatically releases all other buttons. This is a feature of gimx.  
  
Release(button)  
string button - a valid button  
  
Hold(button)  
string button - a valid button  
  
  
#Buttons  
Pressure 0-1  
"lstick x", "lstick y", "rstick x", "rstick y ", "acc x", "acc y", "acc z", "gyro", "up", "right", "down", "left", "triangle", "circle", "cross, "square", "l1", "l2", "r1", "r2"  
  
Pressure 0 or 1  
"select", "start", "PS", "l3", "r3"

#Licence
The MIT License (MIT)

Copyright (c) 2015 Stephen Poole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
