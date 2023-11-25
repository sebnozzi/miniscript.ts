clear "white"

doIt = function
    img = loadImage("https://miniscript.org/img/Icon135x135.png")
    drawImage img, 50, 200
    drawText "Hello miniScript", 100, 100, "black", 32
    return img
end function

img = doIt

for i in range(1, 50)
    fillRect 50,200,600,200,"white"
    drawImage img, 50 + (i*10), 200
    wait 0.2
end for

clear "black"