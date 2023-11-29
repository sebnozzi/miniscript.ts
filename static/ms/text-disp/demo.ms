
chars = "0123456789"
rowColors = [color.pink, color.lime, color.aqua, color.green, color.yellow]
colorIdx = 0

for rowNr in range(0,25)
	// Print row nr
	charIdx = 3

  rowNrStr = str(rowNr)

  text.setCell rowNrStr[0],0,rowNr
  text.setCellColor 0,rowNr,rowColors[colorIdx]

  if (rowNr > 9) then
    text.setCell rowNrStr[1],1,rowNr
    text.setCellColor 1,rowNr,rowColors[colorIdx]
  end if

	// Print rest of chars in row
	for colNr in range(3,67)
    text.setCell chars[charIdx],colNr,rowNr
    text.setCellColor colNr,rowNr,rowColors[colorIdx]
    text.setCellBackColor colNr,rowNr,rowColors[(colorIdx + 1) % rowColors.len]
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
print "MiniScript!"

wait 1

text.color = color.lime
print ""
print "(using text-display)"

wait 1

text.color = color.aqua

text.row = 0
// This should cause scrolling!
for i in range(1,30)
  print i
  wait 0.1
end for
text.delimiter = ""
text.print "END"
