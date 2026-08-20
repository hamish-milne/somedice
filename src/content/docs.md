# SomeDice Documentation

SomeDice is a tool for calculating probabilities and outcomes of dice rolls, often used in tabletop games. If you are a GM or designer you can use SomeDice to balance encounters and mechanics, or create entire systems from scratch. If you are a player, SomeDice can help you understand the odds of your actions and make better decisions. SomeDice uses a flexible coding language that can define simple dice pools as well as complex systems with functions, variables, and loops.

SomeDice is inspired by, and compatible with, Jasper Flick's [AnyDice](https://anydice.com/) and in fact uses the same syntax. If you find SomeDice useful you are encouraged to donate to [Catlike Coding](https://ko-fi.com/catlikecoding) to support Jasper's work.

## Getting Started

The simplest way to use SomeDice is to write `output`, followed by an expression, like so:

```
output 3d6 + 1
```

Click 'Run' and SomeDice will calculate the probability distribution of rolling three six-sided dice and adding one to the result. The output is visible in the graph to the left of, or below, the code editor. You can freely switch between graphs that show the probability distribution (i.e. the exact chances of each result), and the cumulative 'at least' or 'at most' graphs, which show the chances of rolling at least or at most a certain result.

SomeDice expressions are like normal math expressions. You can use the following operators, which behave exactly as you would expect:

- `+` (addition)
- `-` (subtraction)
- `*` (multiplication)
- `/` (division)
- `^` (exponentiation)

SomeDice only works with integers (whole numbers). Decimal fractions like `1.5` are not allowed, and division always rounds towards zero. For example, `5 / 2` is equivalent to `2`, and `-5 / 2` is equivalent to `-2`.

You can group expressions with parentheses, which is useful for controlling the order of operations. For example, `3d6 + 1` is equivalent to `(3d6) + 1`, but `3d(6 + 1)` is equivalent to `3d7`, which rolls three seven-sided dice.

The `d` operator is used to roll dice. The left side of the `d` is the number of dice to roll, and the right side is the number of sides on each die. For example, `3d6` rolls three six-sided dice, while `1d20` rolls one twenty-sided die. If you omit the left side of the `d`, it is assumed to be 1. For example, `d6` is equivalent to `1d6`.

You can define as many outputs as you like, and the results will be plotted as separate lines on the graph. You can also give each output a name by using the `named` keyword, like so:

```
output 1d20+5 named "Attack Roll"
output 2d6+3 named "Damage Roll"
```

If you want to include notes or comments in your code, simply surround the text with `\` characters, like so:

```
\This is a comment and will not be executed.\
```

## Variables

Variables are used to store values that can be used in expressions later. A variable name can be any sequence of upper-case letters. You can define a variable using a colon `:` followed by an expression, like so:

```
HP: 10
STR: 3
DEX: 2
```

If you assign a variable a second time, it will replace the old value:

```
X: 1
X: X + 1
X: X + 1
output X \This will output 3, because the variable X was incremented twice.\
```

## Conditionals

Conditionals allow you to execute different code based on certain conditions. The basic conditional structure uses the `if` and `else` keywords, like so:

```
if HP > 0 {
  ALIVE: 1
} else {
  ALIVE: 0
}
```

You can also chain conditionals together using `else if`, like so:

```
if HP > 0 {
  ALIVE: 1
} else if HP == 0 {
  ALIVE: 0
} else {
  ALIVE: -1
}
```

You can use comparison operators to compare values in conditionals. The available comparison operators are:

- `=` (equal to)
- `!=` (not equal to)
- `>` (greater than)
- `<` (less than)
- `>=` (greater than or equal to)
- `<=` (less than or equal to)

The result of a comparison is either 1 or 0. The `if` statement executes the code block if the condition is true (anything other than 0), and skips it if the condition is false (0).

## Sequences

A sequence is a list of numbers that can be used in expressions. Sequences are defined using curly braces, with values separated by commas, like `{1, 2, 3}`. You can also use ranges to define sequences, like `{1..6}` which is equivalent to `{1, 2, 3, 4, 5, 6}`. You can include other sequences in a sequence, like `{1, 2, {3, 4}, 5}` which is equivalent to `{1, 2, 3, 4, 5}`; or a dice value, like `{d4}` which is equivalent to `{1, 2, 3, 4}`. These options can be combined in any way, and the result is always a single flat sequence of numbers. Sequences can have duplicates of the same value, and their order is preserved.

Note that when adding dice to a sequence, the probability information is removed. For example `{2d4}` is equivalent to `{2..8}`. This can be useful if you want to turn a non-uniform distribution into a uniform one.

You can get the length of a sequence using the `#` operator, like so:

```
S: {1, 2, 3, 4}
output #S \This will output 4.\
```

You can get individual values from a sequence using the `@` operator, like so:

```
S: {2, 4, 6, 8}
output 1@S \This will output 2.\
```

If the index is 0 or less, or greater than the length of the sequence, the result is 0.

If you use a sequence in an expression, it will be converted to a number by summing all of its values. For example, `{1, 2, 3} + 4` is equivalent to `10`, because the sum of the sequence is `6`, and `6 + 4 = 10`.

The exception to this rule is the comparison operators. If you compare a sequence to a number, then each element of the sequence is compared to the number, and the result is the number of elements that match the comparison. For example, `{1, 2, 3} > 2` is equivalent to `1`, because only one element of the sequence is greater than `2`.

If you compare two sequences, then each element of the first sequence is compared to the corresponding element of the second sequence, and the result is the number of elements that match the comparison. For example, `{1, 2, 3} > {0, 2, 4}` is equivalent to `1`, because only one element of the first sequence is greater than the corresponding element of the second sequence.

> [!IMPORTANT]
> Sequence-to-sequence comparisons are defined differently in AnyDice, which for greater-than/less-than returns 1 if _any_ element matches, and for equal/not-equal returns 1 if _all_ elements match. To check for an exact match in SomeDice, you can compare the result to the length of the sequence, like `(A > B) = #A`. To check for any match, you can compare the result to 0, like `(A > B) > 0`.

## Dice

We have seen that the `d` operator is used to define dice, like `3d6`. However both sides of the operator can be a number, sequence, or another die.

When the right side is a sequence, the die can roll any of the values in the sequence, with a probability proportional to the number of times that value appears in the sequence. For example, `1d{1, 2, 2, 3}` will roll a `1` with probability `1/4`, a `2` with probability `1/2`, and a `3` with probability `1/4`.

When the left side is a number other than 1, the result is a 'collection' of dice. With dice collections you can examine each possible sequence of face values using functions. Most other operations on a dice collection will convert it into a single die by summing the face values of each die in the collection. For example, `2d2 + 0` is equivalent to `d{2, 3, 3, 4}`.

When the left side is a die, the result is calculated as if the left side was rolled first, and the resulting number is used as the number of right side dice to roll. For example `d3d6` will roll a `d6` one, two, or three times, depending on the result of the `d3`. This result value is always a single die, not a collection.

## Loops

Loops allow you to repeat a block of code multiple times. The basic syntax for a loop is:

```
loop N over {1..4} {
  output N \This will output 1, 2, 3, and 4.\
}
```

The `loop` keyword is followed by a variable name, the `over` keyword, and a sequence. The code block inside the loop will be executed once for each value in the sequence, with the loop variable set to the current value. You can add new outputs, or modify existing variables inside the loop. For example, the following calculates a sequence of fibonacci numbers:

```
FIB: {1, 1}
loop I over {1..10} {
  FIB: {1@FIB + 2@FIB, FIB}
}
output d{FIB} \This will output the first 12 fibonacci numbers.\
```

## Functions

Functions allow you to define reusable blocks of code that can be called with different arguments. The basic syntax for a function is:

```
function: do something to A with B {
  result: A + B
}

output [do something to 3 with 4] \This will output 7.\
```

Functions are defined with a sequence of **keywords** and **parameters**. Keywords are any sequence of lower-case letters and are used to identify the function, and parameters are any sequence of upper-case letters and are used to pass values into the function. The code block inside the function can use the parameters as variables, and can define new variables (called 'local' variables) or outputs.

The result of the function is the value of the `result` variable at the end of the code block. As soon as a result is defined, the function will return that value and stop executing. If no result is defined, the function will return the empty sequence `{}`.

To call a function, enclose the function keywords and arguments in square brackets, like `[do something to 3 with 4]`. The keywords must match the function definition exactly, and the arguments are evaluated and passed to the function parameters. The result of the function call can be used in any expression.

Functions can call themselves, which is called recursion. There is no hard limit to the number of times a function can call itself, but if a function calls itself too many times without returning a result it will eventually use up all the available memory and cause an error.

By default, function parameters will accept any value without conversion, however you can specify a type for each parameter by adding a colon and the type name after the parameter name. The available types are:

- `n` (number)
- `s` (sequence)
- `d` (die)

Specifying a parameter type causes the argument to be converted to that type before being passed to the function. The rules for type conversion are as follows:

- For the `n` type:
  - A number is passed unchanged
  - A sequence is converted to a number by summing its values
  - When a die or collection is passed, **the function is called once for each possible outcome**, with the result being a new die
- For the `s` type:
  - A number is converted to a sequence with a single value
  - A sequence is passed unchanged
  - When a die or collection is passed, **the function is called once for each possible sequence of face values**, with the result being a new die. These sequences are ordered with the highest face values first.
- For the `d` type:
  - A die or collection is passed unchanged
  - A number is converted to a die which can roll only that number
  - A sequence is converted to a die which can roll a single number, which is the sum of its values

Passing dice to a function with a parameter type of `n` or `s` allows you to perform any calculation which follows from the outcome of the a previous roll. This is extremely useful for any system which splits the 'attack' and 'damage' phases of an action, for example. The following function calculates the damage output for an attack action in D&D 5e:

```
function: calculate damage for ATTACK:s mod MODIFIER:n against AC:n with DAMAGE:d {
  NAT: 1@ATTACK
  if NAT = 20 {
    result: (DAMAGE + MODIFIER) * 2
  } else if NAT = 1 | (NAT + MODIFIER) < AC {
    result: 0
  } else {
    result: DAMAGE + MODIFIER
  }
}
output [calculate damage for d20 mod 5 against 15 with 2d6+3]
```

> [!WARNING]
> Iterating over a large dice pool can take a long time and use a lot of memory. SomeDice will throw an error if the number of unique sequences generated exceeds 1 billion, but it is still possible to run out of memory and crash the browser tab. A good rule when iterating over a pool of `NdM` dice is to keep `N*M` below 100.
