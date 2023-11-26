clear

img = file.loadImage("Fighter-small.png")

x = 300
y = 300
v = 5

keepWithin = function(v, min, max)
  if v < min then return min
  if v > max then return max
  return v
end function

while true
  clear
  gfx.drawImage img,x,y
  if key.pressed("left") then x -= v
  if key.pressed("right") then x += v
  if key.pressed("up") then y += v
  if key.pressed("down") then y -= v

  x = keepWithin(x, 20, 880)
  y = keepWithin(y, 20, 570)

  yield
end while
