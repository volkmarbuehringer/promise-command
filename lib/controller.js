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

    this.errprob=0;
  }
  errHandler ( pos,err ){
    return err;
  }
  objHandler (pos,obj ){
    return obj;
  }
  startOne(fun, c) { //start function with object and supply event emit after end
    const temp = { id: this.running++,
      start: process.hrtime()

    };

    if (temp.id >= this.limit) {
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

        if (this.errcollector.push(err) >= this.errorlimit) {
          //stop working, too many errors, but wait until finished
          this.done = true;
        }
         this.errHandler(pos,err); //user handling of error
      }
        if (pos !== undefined ) {
          //     debug("caught",  obj);
          if ( obj  && this.collect) {
            this.collector[pos.id] = this.objHandler(pos,obj); //store endresult in order of start like Promise.all
          }

          this.open.delete(pos); //remove from map of running
        } else { // no work, only sleep function
          this.sleeper--;
        }

        //check for endcondition of the run

        if (this.sleeper === 0 && this.open.size === 0 && this.done) {
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



        } else { // repeat if end conditition is not reached
          /*          if (iter === this.running) {
                    debug("no new started", iter);
                  }
                  */
                  this.run();
        }
      }

  run() {
    while (!this.done && this.sleeper === 0 && this.open.size < this.parallel) {
      const done = this.startgen.next();
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

    return Promise.resolve()
    .then(()=>{
      this.done = false;
      this.startgen=startgen;
      this.on("arbeiten",this.waiterEnd.bind(this) );
      this.run();

      return   new Promise((resolve, reject) =>        this.once("ende", (err, result) =>{
          this.removeAllListeners("arbeiten");

          return err ? reject(err) :
              resolve(result);

            }));

    }  );
  }


  tester(x) { // supply test function
    const val = Math.random() * 5 ;
    return new Promise((resolve, reject) => setTimeout(() => {
      if (Math.random() < this.errprob) {
        return reject({
          message: "kaputti" + this.running
        });
      } else {
        return resolve(Object.assign(x,{val}));
      }
    }, val));
  }

  statistik() { //current statistics of  run
    let entry=[null,null];

    for ( entry of this.open.entries()) {
    break;
}
    return {
      limit: this.limit,
      parallel: this.parallel,
      errorlimit: this.errorlimit,
      notReady: this.running - this.collector.length, //number still in work
  //    openrun: [...this.open.keys()], // ids which are still running (oldest first)
      longes: entry[0]?process.hrtime(entry[0].start):null,
      size: this.open.size,
      longestobj: entry,
      finished: this.collector.length, //number of finished
      errors: this.errcollector.length, //number of errors
      lastStarted: this.running, //last id which was started
      sleeps: this.sleeper, //number of sleep functions which are blocking
      done: this.done,
      cpu: this.startUsage=process.cpuUsage(this.startUsage)
    };

  }
}

module.exports = Controller;
