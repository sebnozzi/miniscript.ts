gfx.clear

img = file.loadImage("Fighter-small.png")
rockImg = file.loadImage("Rock.png")
bg = file.loadImage("sky-background.png")

snd = file.loadSound("pew.wav")

gfx.drawImage bg,0,0

x = 300
y = 300
v = 5
size = 40

keepWithin = function(v, min, max)
  if v < min then return min
  if v > max then return max
  return v
end function

fighter = new Sprite
fighter.x = x
fighter.y = y
fighter.image = img

Rock = new Sprite
Rock.image = rockImg
Rock.update = function
  self.y -= self.v
  if self.y < 0 then 
    self.y = 640
    self.x = floor(rnd * 960)
  end if 
end function

sprd.sprites.push fighter

rocks = []
// Create rocks
for i in range(1,7)
  rock = new Rock
  rock.x = floor(rnd * 960)
  rock.y = floor(rnd * 640)
  rock.v = 0.5 + (rnd * 2)
  sprd.sprites.push rock
  rocks.push rock
end for

while true
  for r in rocks
    r.update
  end for

  if key.pressed("left") then x -= v
  if key.pressed("right") then x += v
  if key.pressed("up") then y += v
  if key.pressed("down") then y -= v

  if key.available then
    k = key.get
    if k == " " then 
      snd.play
    end if
  end if

  if mouse.button then
    print "mouse-click" + [mouse.x, mouse.y]
    gfx.fillEllipse mouse.x-size,mouse.y-size,size,size,color.red
    gfx.drawRect mouse.x-size/2,mouse.y-size/2,size,size,color.blue,2
  end if

  x = keepWithin(x, 50, 960-50)
  y = keepWithin(y, 50, 640-50)

  fighter.x = x
  fighter.y = y

  yield
end while
