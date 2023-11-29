
width = 960
height = 640
charHeight = 24 // height / 26
charWidth = 14 // width / 68
// Center on display
originX = 5 // 960 / 2 - ((charWidth * 68) / 2)
originY = 6 // 640 / 2 - ((charHeight * 26) / 2)

chars = "0123456789"
rowColors = [color.pink, color.lime, color.aqua, color.green, color.yellow]
colorIdx = 0

for rowNr in range(0,25)
	// Print row nr
	charIdx = 3
	x = originX 
	y = originY + (rowNr ) * charHeight
	//gfx.print rowNr,x,y,rowColors[colorIdx],"normal"

  text.setCell str(rowNr)[0],0,rowNr
  text.setCellColor 0,rowNr,rowColors[colorIdx]

  if (rowNr > 9) then
    text.setCell str(rowNr)[1],1,rowNr
    text.setCellColor 1,rowNr,rowColors[colorIdx]
  end if

	// Print rest of chars in row
	for colNr in range(3,67)
		x = originX + (colNr ) * charWidth
		//gfx.print chars[charIdx],x,y,rowColors[colorIdx],"normal"
    text.setCell chars[charIdx],colNr,rowNr
    text.setCellColor colNr,rowNr,rowColors[colorIdx]
    text.setCellBackColor colNr,rowNr,rowColors[(colorIdx + 1) % rowColors.len]

		//gfx.fillRect x,y,4,4,rowColors[colorIdx]
		charIdx += 1
		charIdx %= chars.len
	end for
	colorIdx += 1
	colorIdx %= rowColors.len
end for

gfx.drawRect 0,0,960,640,color.red

wait 1

clear

print "Hello"
print "miniScript!"

wait 1

text.color = color.lime
print ""
print "(using text-display)"
