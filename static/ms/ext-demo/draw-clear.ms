//clear 

gfx.fillRect 0,0,200,200,color.blue
gfx.fillRect 50,50,100,100,color.green
// Should draw a hole in the middle
gfx.fillEllipse 0,0,200,200,color.rgba(255,0,0,100)
gfx.fillRect 50,50,100,100,color.rgba(0,255,0,100)

