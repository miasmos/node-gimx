# node-gimx
Send commands to gimx via js.  
  
#Methods  
Press(button, pressure)  
string button - a valid button  
number pressure - a number from 0 to 1 representing how far down the button is pushed  
*A press call automatically releases all other buttons. This is a feature of gimx.  
  
Release(button)  
string button - a valid button  
  
  
#Buttons  
Pressure 0-1  
"lstick x", "lstick y", "rstick x", "rstick y ", "acc x", "acc y", "acc z", "gyro", "up", "right", "down", "left", "triangle", "circle", "cross, "square", "l1", "l2", "r1", "r2"  
  
Pressure 0 or 1  
"select", "start", "PS", "l3", "r3"


