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
    this.open = new Set();
    this.running = 0;
    this.finished=0;
    this.fun = fun;
    this.limit = limit || 999999999;
    this.parallel = parallel || 20;
    this.parallelsave = this.parallel;
    this.errcollector = new Set();

    this.errprob = 0;
  }
  errHandler(pos, err) {
    return true; // exit on error
  }
  objHandler(pos, obj) {
    return obj;
  }

  *
  startOne(fun, input) { //start function with object and supply event emit after end

    const helper = (fun) => {
      if (!fun && typeof fun !== "function") {
        throw new Error("no function");
      }

      const temp = {
        id: this.running++,
        start: process.hrtime(),
        name: fun.name,
        input
      };

      if (temp.id >= this.limit) {
        this.done = true;
      }

      this.open.add(temp); //store running object
      return fun(input)
        .then((res) => this.emit("arbeiten", null, res, temp)) // emit result
        .catch((err) => this.emit("arbeiten", err, null, temp)) // emit error
      ;

    };
    let r;
    if (Array.isArray(fun)) {
      for (let i = 0; i < fun.length; i++) {
        r=yield helper(fun[i]);
      }
    } else {
      r=yield helper(fun);
    }
    return r;

  }

  *
  startAll(iterator) { //start  function with an iterator n times
    this.sleepval = null;
    const r=[];
      let done = iterator.next();
    while (!done.done){
      if ( this.open.size >= this.parallel  ){
        r.push( yield Promise.resolve());
      }  else {
        r.push(yield* this.startOne(this.fun, done.value));
          done = iterator.next();
      }

    }
    return r;

  }


  *
  waiter(starttim) { //block with a sleep function, if starttime is not yet reached
    const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p));
    const r=[];
    if ((this.sleepval = starttim) > 0) {
      this.sleeper++;
      r.push(yield timeouter(this.sleepval)
        .then(() => this.emit("arbeiten"))); // after sleeping emit event
        while ( this.sleeper ){
          r.push( yield Promise.resolve());
        }
    }
    return r;
  }

  endHandler() {
      if (this.errcollector.size > 0) { //throw with error
        debug("finished with error %d", this.errcollector.size);
        this.emit("ende", [...this.errcollector]);
      } else { // return the array of results
        debug("finished with gen");
        //return Promise.resolve(this.collector);
        this.emit("ende", null, []);
      }

    }
    /* run controlled by a generator function, which supplies the promises*/

  waiterEnd(err, obj, pos) {

    if (err) {
      debug("caughterr %d", this.errcollector.size, err, obj, pos);
      //store error

      this.errcollector.add( err); //user handling of error
      if (this.errHandler(Object.assign(pos, {
        diff: process.hrtime(pos.start)
      }), err)) { //too many errors
        this.done = true;
      }
    }
    if (pos !== undefined) {
      // debug("caught", pos, obj);

      if (obj) {
        this.objHandler(Object.assign(pos, {
          diff: process.hrtime(pos.start)
        }), obj); //user handling of result
      }

      this.open.delete(pos); //remove from map of running
      this.finished++;
    } else if ( this.sleeper>0){ // no work, only sleep function
      this.sleeper--;
    }

    //check for endcondition of the run
    do {
      if (this.sleeper === 0 && this.open.size === 0 && this.done) {
        return this.endHandler();
      }
    } while (this.run(pos));


  }


  run(ne) {


    while (!this.done  ) {
      //  debug("starting %d %d %d", this.open.size, this.done, this.running);
      const done = this.startgen.next(ne);
      if ( this.sleeper || this.open.size >= this.parallel  ){
        break;
      }
      ne=null;
      if (!this.done) {
            if ( (this.done=done.done)){
            return true;
        }

      }

    }
    return false;
  }

   makeIterator (array){
      var nextIndex = 0;

      return {
         next: function(){
             return nextIndex < array.length ?
                 {value: array[nextIndex++], done: false} :
                 {done: true};
         }
      };
  }

  makeIteratorInp (array){
     var nextIndex = 0;

     return {
        next: function(){
          for (;;){
          if ( nextIndex < array.length){
            const value = array[nextIndex++];
              if ( value && "input" in value ){
                return { value: value.input ,done: false};
              }
          } else {
            return     {done: true};
          }

      }
     }
 };
}



  *
  dataGenerator(res) {

  return yield* this.startAll(this.makeIterator(res));


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
        this.run(null);

        return new Promise((resolve, reject) => this.once("ende", (err, result) => {
          this.removeAllListeners("arbeiten");

          return err ? reject(err) :
            resolve(result);

        }));

      });
  }


  tester(x) { // supply test function
    const val = Math.random() * 2100;
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

  checkRunning(limit,limit1) {
    this.parallel = this.parallelsave;
    let i = 0;
    this.slow=null;
    for (const entry of this.open) {
      const tim = process.hrtime(entry.start);
      Object.assign(entry, {
        diff: tim
      });
      if ( i++ === 0 ){
        this.slow = entry;
      }
      if (tim[0] < limit || (limit === 0 && tim[1]<limit1)) {
        break;
      }
    }
    if (i > 0) {
      return ([...this.open].slice(0, i));
    } else {
      return [];
    }

  }

  statistik() { //current statistics of  run

    return {
      limit: this.limit,
      parallel: this.parallel,
      finished: this.finished,
            lastStarted: this.running, //last id which was started
      slowest: this.slow,

      //    openrun: [...this.open.keys()], // ids which are still running (oldest first)
      size: this.open.size,
      errors: this.errcollector.size, //number of errors

      sleeps: this.sleeper, //number of sleep functions which are blocking
      done: this.done,
      cpu: this.startUsage = process.cpuUsage(this.startUsage)
    };

  }
}

module.exports = Controller;
