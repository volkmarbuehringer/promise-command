"use strict";

const debug = require("debug")("controller");
const EventEmitter = require("events");


class Controller extends EventEmitter {
  constructor(param) {
    super();
    const {
      parallel,
      limit,
        fun
    } = param;
    this.sleeper = 0;
    this.open = new Map();
    this.running = 0;
    this.fun = fun;
    this.limit = limit || 999999999;
    this.parallel = parallel || 20;
    this.errcollector = new Map();

    this.errprob = 0;
  }
  errHandler(pos, err) {
    return true; // exit on error
  }
  objHandler(pos, obj,input) {
    return obj;
  }

  *startOne(fun, c, pos) { //start function with object and supply event emit after end

    const helper=(fun)=>{
      if ( !fun && typeof fun !== "function"){
        throw new Error("no function");
      }

      const temp = {
        id: this.running++,
        start: process.hrtime(),
        pos
      };

      if (temp.id >= this.limit) {
        this.done = true;
      }

      this.open.set(temp, c); //store running object
      return fun(c)
            .then((res) => this.emit("arbeiten", null, res, temp)) // emit result
              .catch((err) => this.emit("arbeiten", err, null, temp)) // emit error
  ;

};

    if ( Array.isArray(fun)){
      for ( let i=0;i< fun.length;i++){
        yield helper(fun[i]);
      }
    } else {
      yield helper(fun);
    }


  }

  *
  startAll(iterator) { //start  function with an iterator n times
    this.sleepval = null;
    for (let i = 0; i < iterator.length; i++) {
      if (iterator[i] !== undefined) {
        yield *this.startOne(this.fun, iterator[i], i);
      }
    }


  }


  *
  waiter(starttim) { //block with a sleep function, if starttime is not yet reached
    const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p));

    if ((this.sleepval = starttim) > 0) {
      this.sleeper++;
      yield timeouter(this.sleepval)
        .then(() => this.emit("arbeiten")); // after sleeping emit event
    }

  }

  endHandler(){
    if (this.errcollector.size > 0) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector.values()]);
        } else { // return the array of results
      debug("finished with gen");
      //return Promise.resolve(this.collector);
      this.emit("ende", null,[]);
    }

  }
  /* run controlled by a generator function, which supplies the promises*/

  waiterEnd(err, obj, pos) {

    if (err) {
      debug("caughterr %d", this.errcollector.size, err,obj,pos);
      //store error

        this.errcollector.set(pos,err); //user handling of error
        if ( this.errHandler(pos, err) ){  //too many errors
          this.done=true;
        }
    }
    if (pos !== undefined) {
         debug("caught", pos, obj);
      if (obj) {
        this.objHandler(pos, obj,this.open.get(pos)); //store endresult in order of start like Promise.all
      }

      this.open.delete(pos); //remove from map of running
    } else { // no work, only sleep function
      this.sleeper--;
    }

    //check for endcondition of the run
    do{
    if (this.sleeper === 0 && this.open.size === 0 && this.done) {
        return this.endHandler();
    }
    } while ( this.run() );


  }


  run() {


    while (!this.done && this.sleeper === 0 && this.open.size < this.parallel) {
      debug("starting %d %d %d", this.open.size, this.done, this.running);
      const done = this.startgen.next();
      if (!this.done) {
        this.done = done.done;
        return true;
      }

    }
    return false;
  }

  *
  dataGenerator(res) {

    yield* this.startAll(res);

  }


  runner(iterator) {
    // wait for finished promise,
    // catch the promise after run and do end handling of the promise

    // fetch promises from generator with limited parallelism



    return Promise.resolve()
      .then(() => {
        this.done = false;
        this.startgen = this.dataGenerator(iterator);
        this.on("arbeiten", this.waiterEnd.bind(this));
        this.run();

        return new Promise((resolve, reject) => this.once("ende", (err,result) => {
          this.removeAllListeners("arbeiten");

          return err ? reject(err) :
            resolve(result);

        }));

      });
  }


  tester(x) { // supply test function
    const val = Math.random() * 5;
    return new Promise((resolve, reject) => setTimeout(() => {
      if (Math.random() < this.errprob) {
        return reject({
          message: "kaputti" + this.running
        });
      } else {
        return resolve(Object.assign(x, {
          val
        }));
      }
    }, val));
  }

  statistik() { //current statistics of  run
    let entry = [null, null];

    for (entry of this.open.entries()) {
      break;
    }
    return {
      limit: this.limit,
      parallel: this.parallel,
        //    openrun: [...this.open.keys()], // ids which are still running (oldest first)
      longes: entry[0] ? process.hrtime(entry[0].start) : null,
      size: this.open.size,
      longestobj: entry,
      errors: this.errcollector.size, //number of errors
      lastStarted: this.running, //last id which was started
      sleeps: this.sleeper, //number of sleep functions which are blocking
      done: this.done,
      cpu: this.startUsage = process.cpuUsage(this.startUsage)
    };

  }
}

module.exports = Controller;
