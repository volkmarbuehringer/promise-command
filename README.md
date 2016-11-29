# promise-command
Parallel execution of ES6 promises without Promise.all

## Controlling parallel execution of promises 

It allows control of parallelism like async.parallelLimit combined with better debug-capabilities and more flexibility.

## Usage of ES6 features

it works only with node 6 and 7 with full es6-support

## Simple-Example:

``` javascript
const Controller = require("promise-command");

const crawler =  //function for parallel execution with promises
  (obj) => Promise.resolve(obj)
  .then((obj) => {
    obj.message = null;

    return obj;
  })
  .then((obj) => controller.tester(obj));  //use test function

const controller = new Controller({
  parallel: 200,  // maximal parallism
  fun: crawler  //function to use
});

Promise.resolve()
  .then(() => {  // prepare array of data
    controller.daten = [];
    let count = 1000;
     for (let i = 0; i < count; i++) {
      controller.daten.push({
        id: i
      });
    }
    return controller.daten;
  })
  .then((res) => controller.runner(res))   //execute function over array
  .then((x) => {  // await results after completion
    console.log("finished",x);
  })
  .catch((err) => {
    console.error("exit with error",err);
  });
```
## Overwriting the Controller-Class

``` javascript
class Controller1 extends require("promise-command") {
  constructor(param) {
    super(param);
      this.collector = [];  //collect the results
    }
    
    // overwrting of error handler
  errHandler(pos, err) {
    debug("error",err,pos);
    // delete the data  with errors in the source for repeating
    delete this.daten[pos.pos];  
    if ( this.errcollector.size > 30 ){  //stop only after 30 errors
      return true;
    } else {
      return false;
    }
  }
  
  
  //user handling of every completed object
  objHandler(pos, obj,input) { 
    //debug("hier da",pos,obj);
    
    this.collector[pos.id] = Object.assign(obj, {
      diff: process.hrtime(pos.start) //add timing
    }); //store endresult in order of start like Promise.all

  }
  
  //overwrite handling of end results
  endHandler(){
    if (this.errcollector.size > 30) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector.entries()]);
        } else { // return the array of results
      debug("finished with gen");
          this.emit("ende", null,this.collector);
    }

  }

//overwrite data generation
  *
  dataGenerator(res) {

    try {
      const iter1 = this.makeIteratorFun(res, null, this.fun);  //prepare iterator fun,iterate over input data

//only 1 iteration over data,collector and iterator are seperate
//let first = yield* this.startAll([], () => iter1.next());

//repeat endless with iterator over data, until limit is reached, iterator works on collector
      let first = yield* this.startAll(res, () => iter1.next(), 30000); //start generator with iterator, limit 30000 iterations
// in first are now the executions which are finished, the still running executions are missing

      debug("wait now until finished");  
      const l = yield* this.waiterFinished(3000, true);  // wait unitl finished or 3secs passed
      debug("now end %d", l.length);

      return first.concat(l);  //all results
    } catch (err) {
      debug("error generator", err);
    }
  }

}
```


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

