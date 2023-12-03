infiniteSequence = function(elements)
	seq = new InfiniteSequence
	seq.init elements
	return seq
end function

InfiniteSequence = {}

InfiniteSequence.init = function(elements)
	self.idx = 0
	self.elements = elements
end function

InfiniteSequence.next = function
	element = self.peek
	self.advance
	return element
end function

InfiniteSequence.peek = function
	return self.elements[self.idx]
end function

InfiniteSequence.advance = function
	self.idx = (self.idx + 1) % self.elements.len
end function

// == DEMO
if globals == locals then
	clear
	seq = infiniteSequence(["Tic","Tac","Toe","-"])
	for i in range(1,25)
		print seq.next
		wait 0.1
	end for 
end if