// Test file for same-file context feature
// This tests if Puku can learn parameter naming patterns from existing functions

function add(firstNumber: number, secondNumber: number): number {
	return firstNumber + secondNumber;
}

function multiply(firstNumber: number, secondNumber: number): number {
	return firstNumber * secondNumber;
}

// Test: Type "function subtract(" and see if completion suggests firstNumber, secondNumber
// Expected: function subtract(firstNumber: number, secondNumber: number)
// NOT: function subtract(a: number, b: number)

function subtract(
