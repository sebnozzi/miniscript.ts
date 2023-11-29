
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
	gfx.print rowNr,x,y,rowColors[colorIdx],"normal"
	// Print rest of chars in row
	for colNr in range(3,67)
		x = originX + (colNr ) * charWidth
		gfx.print chars[charIdx],x,y,rowColors[colorIdx],"normal"
		gfx.fillRect x,y,4,4,rowColors[colorIdx]
		charIdx += 1
		charIdx %= chars.len
	end for
	colorIdx += 1
	colorIdx %= rowColors.len
end for

gfx.drawRect 0,0,960,640,color.red
