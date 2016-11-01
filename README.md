# promise-command
Parallel execution of ES6 promises without Promise.all

## Controlling parallel execution of promises 

It allows control of parallelism like async.parallelLimit combined with better debug-capabilities and more flexibility.

## Usage of ES6 features

it works only with node 6 and 7 with full es6-support

It implements and uses following features:

### es6-class with extenstion of EventEmitter
the controller with all its variables is inside an es6-class. Every invocation produces a new controller-object which can be independently used.

### generator functions
the user provides a generator function with generates calls of a user-defined function with an user supplied argument.
The controller iterates the generator and produces parallel execution of a limited number of promises.
There is a helper generator for iteration over an used-supplied iterator which generates the different arguments for every function execution. 
Inside the main generator different functions can be used.The user is in full controll. The only condition is that the function is promised based and .then and .catch can be appended.
There is also a helper-generator for pausing execution until a specified point in time. During waiting the execution continues until the pipeline is empty.


### maps
during execution every argument of the running functions together with an incrementing id is collected into a map. After finishing of execution it is deleted from the map.
The execution which takes the longest time is always at the beginning of the map present.
Controlling and debugging of execution is very easy.

### collection-arrays
after execution the results are collected in an array like with Promise.all in the correct order of start.
All errors are also collected into an array. There can be as many errors as executed functions. 

### EventEmitter
Every function call is supplemented with an event emitter at the end of the promise-chain.The event emitter transfers the result or the error into the control function.

### promised based controll-function

after execution of every function call it is brought into the promise-chain of the controller and the results are collected.
Errors are handled with a maximal number of allowed errors before termination.
The controller only terminates when every executed function call is finished. There will be no dangling promises after termination.

### end condition
If the generator stops generation of promises the controller waits until all running promises are finished and the terminates with success error depending on the number of errors. If there are too many errors or the limit of executions in the configuration is reached the controller terminates independently from the generator.

### test-function
the controller contains a simple test-function which can be used for tests together with the user-supplied generator function.

### limitations

the generation of promises can be endless or limited to a finite number. Every promise must terminate otherwise the controller can never end and the program must be terminated with process.exit.

