# node-gimx
Send commands to gimx via js.  
  
  
#Quickstart  
    var gimx = require('./main.js');  
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
  
Macros can also contain other macros. The following would press left, wait a second, press right, wait a second, press up, wait a second, then press down. :  

    g.macro('test1')
      .macro('test').wait(1000)
      .press('up').wait(1000)
      .press('down')
      .add()
    
    g.macro('test1')
      .run()
      
  

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


