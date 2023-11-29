text.row = 0
// This should cause scrolling!
for i in range(1,30)
  print i
  wait 0.1
end for
text.delimiter = ""
text.print "END"