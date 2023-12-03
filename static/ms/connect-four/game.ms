// == IMPORTS

import "animation"
import "solutions"
import "infSequence"

Animation = animation.Animation
infiniteSequence = @infSequence.infiniteSequence

// == CONSTANTS

colCount = 7
rowCount = 6
// This is what this game is about: connect FOUR ;-)
solutionLength = 4

discSize = 70

marginSize = 10
boardMarginBottom = 30
droppingAreaOffset = 100

displayWidth = 960
displayHeight = 640

displayCenterX = displayWidth / 2
displayCenterY = displayHeight / 2

// == SOUNDS

// Load sounds once and cache them to speed-up startup.
if not globals.hasIndex("_sounds") then
	print "Loading sounds ..."
	sounds = {}
	sounds.swooshWav = file.loadSound("/sys/sounds/swoosh.wav")
	sounds.chachingWav = file.loadSound("/sys/sounds/cha-ching.wav")
	globals["_sounds"] = sounds
end if

dropSnd = _sounds.swooshWav
playerWonSnd = _sounds.chachingWav

// == DISPLAY SETUP

clear

text.color = color.silver

// We use the default PixelDisplay at slot 5
display(5).mode = displayMode.pixel
gfx = display(5)

// We introduce a NEW SpriteDisplay below, at slot 6.
// This allows us to draw on the pixel-display above 
// our sprites. Useful e.g. for drawing the "solution line".
display(6).mode = displayMode.sprite
sprd = display(6)
sprd.clear

// == MAIN

main = function
	interactiveGame
	//autoPlayDemo
end function

gameLoop = function(chooseDroppingColumn,askYesNoQuestion)
	
	Board.init
	DroppingArea.init
	
	players = infiniteSequence([RedPlayer, YellowPlayer])
	
	keepPlaying = true
	
	// Loop for many games
	while keepPlaying
		
		Board.reset
		resetDisplays
		
		player = null
		
		// Loop for one game
		while Board.isPlayable
			
			player = players.next
			piece = player.newPiece
			
			colNr = chooseDroppingColumn(piece)
			
			Board.dropPieceIntoColumn piece,colNr
			
		end while
		
		if Board.isSolved then
			drawSolutionLine
			playerWonSnd.play
			print player.name + " player wins!"
		else
			print "Board full. Game over."
		end if
		
		keepPlaying = askYesNoQuestion("Play again? ")
		
	end while
	
end function

// == INTERACTIVE GAME

interactiveGame = function
	
	gameLoop @chooseDroppingColumn, @askYesNoQuestion
	
end function

// == BOARD

Board = new Sprite

Board.pieces = null
Board.solution = null

Board.init = function
	// Initialize model
	self.initModel
	// Set image
	self.image = generateBoardImg
	// Center horizontally
	self.x = displayCenterX 
	// Place towards bottom of display, with a certain margin
	self.y = displayCenterY - (displayHeight - boardTotalHeight) / 2 + boardMarginBottom
	self.width = self.image.width
	self.height = self.image.height	
	// Add to display
	sprd.sprites.push self
end function

Board.reset = function
	for rowNr in range(1,rowCount)
		for colNr in range(1,colCount)
			self.removePiece colNr,rowNr
		end for
	end for
	self.solution = null
end function

Board.initModel = function
	rows = []
	for rowNr in range(1,rowCount)
		column = []
		for colNr in range(1,colCount)
			column.push null
		end for
		rows.push column
	end for
	self.pieces = rows
end function

Board.freeRowAtColumn = function(colNr)
	for rowNr in range(1,rowCount)
		if not self.hasPiece(colNr,rowNr) then
			return rowNr
		end if
	end for
	return null
end function

Board.hasFreeRowAtColumn = function(colNr)
	return self.freeRowAtColumn(colNr) != null
end function

Board.isPlayable = function
	return not (self.isSolved or self.isFull)
end function

Board.isSolved = function
	return self.solution != null
end function

Board.isFull = function
	for colNr in range(1,colCount)
		if self.hasFreeRowAtColumn(colNr) then
			return false
		end if
	end for
	return true
end function

Board.isSolvedByPiece = function(startPiece)
	solvingPieces = self.findSolvingPieces(startPiece)
	return solvingPieces.len == solutionLength
end function

// This looks for solutions around a given start-piece, for
// its player. It returns a list of solving pieces, if any.
Board.findSolvingPieces = function(startPiece)
	playerToMatch = startPiece.player
	
	// This has a list of offsets to apply to the given
	// starting piece. The resulting adjacent pieces have
	// to be of the same player.
	solutions = solutions.solutionOffsets(solutionLength)
	
	for offsets in solutions
		solvingPieces = []
		for offset in offsets
			pieceColNr = startPiece.colNr + offset.col
			pieceRowNr = startPiece.rowNr + offset.row
			piece = self.getPiece(pieceColNr,pieceRowNr)
			// Accumulate adjacent pieces of the same player
			if piece != null and piece.player == playerToMatch then
				solvingPieces.push piece
			end if
		end for
		// If the accumulated pieces have the sought length
		// we found a series of pieces that solve the board.
		if solvingPieces.len == solutionLength then 
			return solvingPieces
		end if
	end for
	
	return null
end function

Board.getPiece = function(colNr,rowNr)
	if isValidPosition(colNr,rowNr) then
		row = self.pieces[rowNr - 1]
		return row[colNr - 1]
	else
		return null
	end if
end function

Board.setPiece = function(piece,colNr,rowNr)
	row = self.pieces[rowNr - 1]
	row[colNr - 1] = piece
	// Save position into piece
	piece.colNr = colNr
	piece.rowNr = rowNr
	// Compute solution (if any)
	self.solution = Board.findSolvingPieces(piece)
end function

Board.hasPiece = function(colNr,rowNr)
	pieceOrNull = self.getPiece(colNr,rowNr)
	return pieceOrNull != null
end function

Board.removePiece = function(colNr,rowNr)
	existingPiece = self.getPiece(colNr,rowNr)
	if existingPiece then existingPiece.remove
	row = self.pieces[rowNr - 1]
	row[colNr - 1] = null
end function

Board.dropPieceIntoColumn = function(piece,col)
	row = self.freeRowAtColumn(col)
	coords = self.positionCoordinates(col,row)
	m = newPieceMovement(piece,coords.x,coords.y)
	
	board = self
	m.onDone = function
		board.setPiece piece,col,row
	end function
	
	dropSnd.play
	m.move
end function

Board.positionCoordinates = function(col,row)
	relativeCoords = positionCenterCoordinates(col,row)
	bottomLeftCornerX = self.x - self.width / 2
	bottomLeftCornerY = self.y - self.height / 2
	absoluteCoords = {
	"x": relativeCoords.x + bottomLeftCornerX, 
	"y": relativeCoords.y + bottomLeftCornerY }
	return absoluteCoords
end function

// == PIECE

newPiece = function(player)
	p = new Piece
	p.init
	p.player = player
	p.tint = player.tint
	sprd.sprites.insert 0,p
	return p
end function

Piece = new Sprite

Piece.init = function
	self.image = generatePieceImage
	self.x = 100
	self.y = 100
	self.tint = color.white
	self.player = null
	// Will be set by Board
	self.colNr = null
	self.rowNr = null
end function

Piece.moveToDroppingArea = function(colNr)
	self.moveToBoardPosition colNr,rowCount
	self.y = self.y + droppingAreaOffset
end function

Piece.moveToBoardPosition = function(col,row)
	coords = Board.positionCoordinates(col,row)
	self.x = coords.x
	self.y = coords.y
end function

Piece.remove = function
	sprIdx = sprd.sprites.indexOf(self)
	sprd.sprites.remove sprIdx
end function

// == Players

Player = {}
Player.name = null
Player.tint = null

Player.init = function(name, tint)
	self.name = name
	self.tint = tint
end function

Player.newPiece = function
	p = newPiece(self)
	return p
end function

newPlayer = function(name, tint)
	p = new Player
	p.init name, tint
	return p
end function

RedPlayer = newPlayer("Red", color.red)
YellowPlayer = newPlayer("Yellow", color.yellow)

// == DROPPING AREA

DroppingArea = {}

DroppingArea.slots = null

DroppingArea.init = function
	self.slots = {}
	lastRow = rowCount
	for colNr in range(1,colCount)
		coords = Board.positionCoordinates(colNr,lastRow)
		
		rect = new Bounds
		rect.x = coords.x
		rect.y = displayCenterY
		rect.width = discSize + marginSize
		rect.height = displayHeight
		
		self.slots[colNr] = rect
	end for
end function

DroppingArea.chooseDroppingColumn = function(piece)
	piece.moveToDroppingArea 1
	pieceColNr = 1
	
	while true
		// Move piece to slot where mouse is positioned
		for slot in self.slots
			slotColNr = slot.key
			slot = slot.value
			if slot.contains(mouse) then
				piece.moveToDroppingArea slotColNr
				pieceColNr = slotColNr
			end if			
		end for
		
		// When clicked, return target position if column not full
		if mouse.button and Board.hasFreeRowAtColumn(pieceColNr) then
			// Wait until mouse is "up" again
			while mouse.button; yield; end while
			// Return column
			return pieceColNr
		end if
		
		yield
	end while
	
end function

// == ANIMATION

newPieceMovement = function(piece,endX,endY)
	pm = new PieceMovement
	pm.init piece,endX,endY
	return pm
end function

PieceMovement = {}

PieceMovement.init = function(piece,endX,endY)
	self.animation = new Animation
	deltaX = abs(endX - piece.x)
	deltaY = abs(endY - piece.y)
	delta = max(deltaX, deltaY)
	duration = 0.05 * (delta / (discSize + marginSize))
	self.animation.init piece,endX,endY,duration
end function

PieceMovement.move = function
	while self.animation.isRunning
		self.animation.update
		yield
	end while
	self.onDone
end function

PieceMovement.onDone = function
	// REPLACE
end function

// == INTERACTION

chooseDroppingColumn = function(piece)
	colNr = DroppingArea.chooseDroppingColumn(piece)
	return colNr
end function

askYesNoQuestion = function(prompt)
	answer = input(prompt)
	answer = answer.lower
	answerIsYes = answer.len > 0 and answer[0] == "y"
	return answerIsYes
end function

// == METRICS

boardTotalWidth = function
	return (discSize + marginSize) * colCount + marginSize
end function

boardTotalHeight = function
	return (discSize + marginSize) * rowCount + marginSize
end function

positionCoordinates = function(col,row)
	x = marginSize + (col - 1) * (discSize + marginSize)
	y = marginSize + (row - 1) * (discSize + marginSize)
	coords = {"x": x, "y": y}
	return coords
end function

positionCenterCoordinates = function(col,row)
	coords = positionCoordinates(col,row)
	coords.x = coords.x + discSize / 2
	coords.y = coords.y + discSize / 2
	return coords
end function

isValidPosition = function(colNr,rowNr)
	validColNr = colNr >= 1 and colNr <= colCount
	validRowNr = rowNr >= 1 and rowNr <= rowCount
	return validColNr and validRowNr
end function

// == DRAWING

generateBoardImg = function
	
	drawBoard = function(disp)
		drawSurface = function
			disp.fillRect 0,0,boardTotalWidth,boardTotalHeight,color.blue
		end function
		drawHoles = function
			for row in range(1,rowCount)
				for col in range(1,colCount)
					coords = positionCoordinates(col, row)
					x = coords.x
					y = coords.y
					disp.fillEllipse x,y,discSize,discSize,color.clear
				end for
			end for	
		end function
		drawSurface
		drawHoles
	end function
	
	disp = new PixelDisplay
	disp.clear color.clear
	drawBoard(disp)
	img = disp.getImage(0,0,boardTotalWidth,boardTotalHeight)
	return img
end function

generatePieceImage = function
	disp = new PixelDisplay
	disp.clear color.clear
	disp.fillEllipse 0,0,discSize,discSize,color.white
	img = disp.getImage(0,0,discSize,discSize)
	return img
end function

drawSolutionLine = function
	solvingPieces = Board.solution
	first = solvingPieces[0]
	last = solvingPieces[-1]
	gfx.line first.x,first.y,last.x,last.y,color.green,20
end function

resetDisplays = function
	gfx.clear color.clear
	text.clear
	text.color = color.silver
	text.row = 25
end function

// == HELPERS

max = function(a,b)
	if a > b then return a else return b
end function

// == AUTOPLAY DEMO

autoPlayDemo = function
	
	chooseRandomColumn = function(piece)
		gfx.fillRect 800,610,960-800,640-610,color.clear
		gfx.print "Random Mode",800,610,color.gray
		while true
			colNr = 1 + floor(rnd * 7)
			if Board.freeRowAtColumn(colNr) then 
				piece.moveToDroppingArea colNr
				wait 0.2
				return colNr
			end if
		end while
	end function
	
	playAgain = function(_prompt)
		wait 2
		return true
	end function
	
	gameLoop @chooseRandomColumn, @playAgain
	
end function

// == MAIN INVOCATION

autoPlayDemo
