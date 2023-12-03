
// Animation class

// It can animate a Sprite from its current position to 
// a target position in the desired amount of time, in a 
// series of steps. 
//
// This last point is important, since it means other things
// can happen at the same time while animating (e.g. processing
// user input, animating other sprites, etc.)
// 
// Basic usage:
// 
// a = new Animation
// a.init someSprite, targetX, targetY, durationInSeconds
// 
// while a.isRunning
//   a.update
//   yield
// end while

Animation = {}

Animation.sprite = null
Animation.durationSecs = 1
Animation.startX = 0
Animation.startY = 0
Animation.endX = 0
Animation.endY = 0
Animation.startTime = null
Animation.endTime = null

Animation.init = function(sprite, endX, endY, durationSecs=1)
	self.sprite = sprite
	self.startX = sprite.x
	self.startY = sprite.y
	self.endX = endX
	self.endY = endY
	self.deltaX = endX - self.startX
	self.deltaY = endY - self.startY
	self.startTime = time
	self.durationSecs = durationSecs
	self.endTime = self.startTime + durationSecs
end function

Animation.update = function
	if self.hasTimeLeft then
		elapsedTime = time - self.startTime
		newX = self.startX + self.deltaX * elapsedTime / self.durationSecs
		newY = self.startY + self.deltaY * elapsedTime / self.durationSecs
		self.sprite.x = newX
		self.sprite.y = newY
	else
		// Force end position if time is up
		self.sprite.x = self.endX
		self.sprite.y = self.endY
	end if
end function

Animation.hasTimeLeft = function
	return time < self.endTime
end function

Animation.endPositionReached = function
	endXreached = self.sprite.x == self.endX
	endYreached = self.sprite.y == self.endY
	return endXreached and endYreached
end function

Animation.isRunning = function
	return not self.endPositionReached
end function


// Example
if globals == locals then
	
	s = new Sprite
	s.image = file.loadImage("/sys/pics/Wumpus.png")
	s.x = 20
	s.y = 300
	
	clear
	sprDisp = display(4)
	sprDisp.sprites.push s
	
	while true
		
		a1 = new Animation
		a1.init s,800,s.y,2
		
		while a1.isRunning
			a1.update
			yield
		end while
		
		a2 = new Animation
		a2.init s,20,s.y,2
		
		while a2.isRunning
			a2.update
			yield
		end while
		
	end while
	
end if
