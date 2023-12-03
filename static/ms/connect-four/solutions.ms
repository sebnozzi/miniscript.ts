
solutionOffsets = function(runLength = 4)
	
	offsets = genericOffsets(runLength)
	
	directions = {
	"horizontal": {"col": 1, "row": 0}, 
	"vertical": {"col": 0, "row": 1}, 
	"diagonal_1": {"col": 1, "row": 1}, 
	"diagonal_2": {"col": 1, "row": -1} }
	
	solutions = []

	for directionName in directions.indexes
		direction = directions[directionName]
		for offsetFactors in offsets
			solution = calculateSolution(direction, offsetFactors)
			solutions.push solution
		end for
	end for
	
	return solutions
	
end function

calculateSolution = function(direction, offsetFactors)
	solution = []
	for offset in offsetFactors
		col = direction.col * offset
		row = direction.row * offset
		offsetToCheck = {"col": col, "row": row}
		solution.push offsetToCheck
	end for
	return solution
end function

genericOffsets = function(runLength)
	offsets = []
	for i in range(1,runLength)
		solution = []
		left = i - 1
		right = runLength - i
		if left > 0 then
			for offset in range(left,1)
				solution.push -1 * offset
			end for
		end if
		solution.push 0
		if right > 0 then
			for offset in range(1,right)
				solution.push offset
			end for
		end if
		offsets.push solution
	end for
	return offsets
end function

if globals == locals then
	clear
	s = solutionOffsets(4)
	pprint s
end if