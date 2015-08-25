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
    
  
#Options  
path - path to gimx.exe  
host - host of remote gimx  
port - port of remote gimx  
  
  
#Methods  
Press(button, pressure)  
string button - a valid button  
optional number pressure - a number from 0 to 1 representing how far down the button is pushed. Defaults to 1.  
*A press call automatically releases all other buttons. This is a feature of gimx.  
  
Release(button)  
string button - a valid button  
  
  
#Buttons  
Pressure 0-1  
"lstick x", "lstick y", "rstick x", "rstick y ", "acc x", "acc y", "acc z", "gyro", "up", "right", "down", "left", "triangle", "circle", "cross, "square", "l1", "l2", "r1", "r2"  
  
Pressure 0 or 1  
"select", "start", "PS", "l3", "r3"


