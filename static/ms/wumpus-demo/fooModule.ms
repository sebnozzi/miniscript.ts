
myFoo = function(n=1)
  return "foo " * n
end function

myOtherDefinition = 123

myExports = {}
myExports.txtTimes = @myFoo

return myExports
