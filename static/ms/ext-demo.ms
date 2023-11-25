clear 

doIt = function
    img = loadImage("https://miniscript.org/img/Icon135x135.png")
    
    //print sss
    
    drawImage(img, 200, 200)
    
    drawText "Hello miniScript", 100, 100, "black", 32
    
    return img
end function

img = doIt

wait 1

for i in range(1, 40)
    clear 
    print i
    drawImage(img, 50 + (i*10), 200)
    wait 0.1
end for
