"use strict";

const debug = require("debug")("controller");
const moment = require("moment");

const EventEmitter = require("events");


class Controller extends EventEmitter {
  constructor(param) {
    super();
    const {
      parallel,
      limit,
      errorlimit,
      errhandler,
      collect
    } = param;
    this.sleeper = 0;
    this.open = new Map();
    this.running = 0;
    this.limit = limit || 999999999;
    this.parallel = parallel || 20;
    this.collect = collect;
    if ( this.collect === undefined ){
      this.collect = true;
    }
    this.collector = [];
    this.errcollector = [];
    this.errorlimit = errorlimit || 1;
    this.errhandler = errhandler || ((err) => err);
  }

  startOne(fun, c) { //start function with object and supply event emit after end
    const temp = this.running++;

    if (temp >= this.limit) {
      this.done = true;
    }

    this.open.set(temp, c); //store running object
    return fun(c)
    .catch((err) => this.emit("arbeiten", err, null, temp))
      .then((res) => this.emit("arbeiten", null, res, temp)) // emit result
      ; // emit error


  }

  *
  startAll(webber, fun) { //start  function with an iterator n times
    this.sleepval = null;
    for (const c of webber) {
      yield this.startOne(fun, c);

    }
  }


  *
  waiter(starttim) { //block with a sleep function, if starttime is not yet reached
    const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p));

    if ((this.sleepval = (starttim - moment.now("X"))) > 0) {
      this.sleeper++;
      yield timeouter(this.sleepval)
        .then(() => this.emit("arbeiten")); // after sleeping emit event
    }

  }

  /* run controlled by a generator function, which supplies the promises*/

  waiterEnd(err,obj,pos) {

    //debug("hier da", obj,err,pos);
  if (err){
        debug("caughterr %d", this.errcollector.length, err);
        //store error

        if (this.errcollector.push(err.err) >= this.errorlimit) {
          //stop working, too many errors, but wait until finished
          this.done = true;
        }
  //      return this.errhandler(err); //repeat
      }
        if (pos !== undefined ) {
          //     debug("caught",  obj);
          if ( obj  && this.collect) {
            this.collector[pos] = obj; //store endresult in order of start like Promise.all
          }

          this.open.delete(pos); //remove from map of running
        } else { // no work, only sleep function
          this.sleeper--;
        }

        //check for endcondition of the run

        if (this.sleeper === 0 && this.open.size === 0 && this.done) {
          this.removeAllListeners("newrun");
          if (this.errcollector.length >= this.errorlimit) { //throw with error
            debug("finished with error %d", this.errcollector.length);
            this.emit("ende", this.errcollector );
            /*
            throw {
              errors: this.errcollector,
              position: this.running
            };
            */
          } else { // return the array of results
            debug("finished with gen", this.collector.length);
            //return Promise.resolve(this.collector);
            this.emit("ende", null,this.collector );
          }

        } else if (this.done) {
          debug("warten auf ende");
        //  return this.waiterEnd();

        } else { // repeat if end conditition is not reached
          /*          if (iter === this.running) {
                    debug("no new started", iter);
                  }
                  */
          if (this.emit("newrun")) {
          //  return this.waiterEnd(); //wait for new results
          } else {
            debug("error");
          }

        }
      }

  run(startgen) {
    while (!this.done && this.sleeper === 0 && this.open.size < this.parallel) {
      const done = startgen.next();
      debug("starting %d %j %d %d", this.open.size, done, this.done, this.running);
      if (!this.done) {
        this.done = done.done;
      }

    }
  }

  runner(startgen) {
    // wait for finished promise,
    // catch the promise after run and do end handling of the promise

    // fetch promises from generator with limited parallelism

    this.done = false;
    this.on("newrun", this.run.bind(this, startgen));
    this.on("arbeiten",this.waiterEnd.bind(this) );
    this.emit("newrun"); //start the run

    return new Promise((resolve, reject) => this.once("ende", (err, result) => err ? reject({
      errors: err,
      position: this.running
    }) :
            resolve(result)));

  }


  tester(x) { // supply test function
    return new Promise((resolve, reject) => setTimeout(() => {
      if (Math.random() < 0.00) {
        return reject({
          message: "kaputti" + this.running
        });
      } else {
        return resolve(x);
      }
    }, Math.random() * 5 + 1));
  }

  statistik() { //current statistics of  run
    return {
      limit: this.limit,
      parallel: this.parallel,
      errorlimit: this.errorlimit,
      notReady: this.running - this.collector.length, //number still in work
      openrun: [...this.open.keys()], // ids which are still running (oldest first)
      finished: this.collector.length, //number of finished
      errors: this.errcollector.length, //number of errors
      lastStarted: this.running, //last id which was started
      sleeps: this.sleeper, //number of sleep functions which are blocking
      done: this.done
        //cpu: this.startUsage=process.cpuUsage(this.startUsage)
    };

  }
}

module.exports = function factory(options) {

  return new Controller(options);
};
