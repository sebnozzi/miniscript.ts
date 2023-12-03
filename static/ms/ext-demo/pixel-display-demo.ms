gfx.clear

img = file.loadImage("Icon135x135.png")
apple = file.loadImage("Apple.png")
banana = file.loadImage("Bananas.png")

//gfx.fillRect 50,50,960-100,640-100,color.red
gfx.drawRect 0,0,960,640,color.green,1
gfx.drawEllipse 960/2-100,640/2-100,100,100,color.blue,2
//gfx.drawImage img,0,0

sprd = display(4)

AnimatedSprite = new Sprite
AnimatedSprite.image = img
AnimatedSprite.posX = 100
AnimatedSprite.dx = 2
AnimatedSprite.dy = 0
AnimatedSprite.r = 0
AnimatedSprite.sc = 1
AnimatedSprite.scd = 0.01
AnimatedSprite.update = function
  self.rotation = self.r
  self.scale = self.sc
  self.sc += self.scd
  if self.sc > 2 then 
    self.sc = 2
    self.scd *= -1
  else if self.sc < 0.5 then
    self.sc = 0.5
    self.scd *= -1
  end if
  self.r += 2
  self.r %= 360
  self.x += self.dx
  if self.x > 860 then
    self.x = 860
    self.dx *= -1
  end if
  if self.x < 100 then
    self.x = 100
    self.dx *= -1
  end if
  self.y += self.dy
  if self.y > 620 then
    self.y = 620
    self.dy *= -1
  end if
  if self.y < 50 then
    self.y = 50
    self.dy *= -1
  end if
end function

s1 = new AnimatedSprite
s1.x = 960/2
s1.y = 640/2

s2 = new AnimatedSprite
s2.x = 50
s2.y = 60
s2.dy = 1.5
s2.tint = color.rgba(0,255,0,200)

sprd.sprites.push s1
sprd.sprites.push s2

colors = [color.fuchsia,color.orange,color.pink,color.green,color.lime,color.aqua]

while true
  
  ix = floor(rnd * 960)
  iy = floor(rnd * 640)
  imidx = floor(rnd * 2)
  if imidx == 0 then
    stamp = apple
  else 
    stamp = banana
  end if
  gfx.drawImage stamp,ix,iy

  x0 = floor(rnd * 960)
  y0 = floor(rnd * 640)
  x1 = floor(rnd * 960)
  y1 = floor(rnd * 640)
  cidx = floor(rnd * colors.len)
  rndColor = colors[cidx]

  gfx.line x0,y0,x1,y1,rndColor,5

  s1.update
  s2.update

  yield
end while
