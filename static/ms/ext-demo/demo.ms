// Looks like Mini Micro APIs!

gfx.clear "black"

gfx.fillEllipse 0,0,100,100,color.red

// Should load image from same relative path
// as this script.
img = file.loadImage("Icon135x135.png")

gfx.fillRect 50,100,300,150,color.olive
gfx.drawImage img, 50,100

myColor = color.rgb(70,80,200)
gfx.print "Hello miniScript", 100, 300, myColor, "large"

print color
