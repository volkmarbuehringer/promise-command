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
      errhandler
    } = param;
    this.sleeper=0;
    this.open = new Map();
    this.running = 0;
    this.limit = limit || 999999999;
    this.parallel = parallel || 20;
    this.collector = [];
    this.errcollector = [];
    this.errorlimit = errorlimit||1;
    this.errhandler=errhandler||((err)=>err);
  }

startOne( fun,c ){  //start function with object and supply event emit after end
    const temp = this.running++;

    if (temp >=  this.limit ){
      throw "End";
    }

  this.open.set(temp,c); //store running object
  return fun(c)
    .then((res) => this.emit("arbeiten", null, res,temp))  // emit result
    .catch((err) => this.emit("arbeiten", err,null,temp));  // emit error


}

*startAll( webber,fun){  //start  function with an iterator n times
  this.sleepval=null;
  for ( const c of  webber) {
    yield this.startOne(fun,c);

    }
  }



*waiter(starttim){  //block with a sleep function, if starttime is not yet reached
  const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p));

  if ((this.sleepval = (starttim - moment.now("X"))) > 0) {
    this.sleeper++;
    yield timeouter(this.sleepval)
      .then(() => this.emit("arbeiten"));  // after sleeping emit event
  }

}

/* run controlled by a generator function, which supplies the promises*/


  runner(startgen) {
// wait for finished promise,
// catch the promise after run and do end handling of the promise

    const waiter = () => new Promise((resolve, reject) => this.once("arbeiten", (err, result,pos) =>err ? reject({err,pos})
    : resolve({result, pos  })))
    .catch((err) => {
      debug("caughterr", err);
            //store error

          if (this.errcollector.push(err.err) >= this.errorlimit ) {
              this.parallel = 0; //stop working, too many errors, but wait until finished
          }
              return this.errhandler(err);  //repeat

    })
    .then((obj) => {

      //debug("caught",  obj);

    if ("pos" in obj && obj.pos != undefined ) {
       if ( "result" in obj){
             this.collector[obj.pos]= obj.result; //store endresult in order of start like Promise.all
       }

          this.open.delete( obj.pos);  //remove from map of running
      }       else {  // no work, only sleep function
        this.sleeper--;
      }

      return run(this.running);  //repeat until end reached
    })
  ;

  // fetch promises from generator with limited parallelism

    const run = (iter) => Promise.resolve()
      .then(() => {

        while ( this.sleeper === 0 && this.open.size < this.parallel && ! startgen.next().done) {
          debug("starting %d", this.running);
        }

        //check for endcondition of the run
        if ( this.sleeper === 0 && this.open.size === 0) {

          if (this.errcollector.length >= this.errorlimit ) { //throw with error
              debug("finished with error %d",this.errcollector.length);
            throw { errors: this.errcollector,
            position: this.running };
          } else {  // return the array of results
              debug("finished with gen",this.collector.length);
            return Promise.resolve(this.collector);
          }

        } else { // repeat if end conditition is not reached
          if ( iter === this.running){
            debug("no new started", iter);
          }
            return waiter(); //wait for new results
      }
      })
            ;

    return run(this.running);  // start the run

  }


   tester (x) {  // supply test function
     return new Promise((resolve, reject) => setTimeout(() => {
    if (Math.random() < 0.02) {
      return reject({
        message: "kaputti"+this.running
      });
    } else {
      return resolve(x);
    }
  }, Math.random() * 3000 ));
}

  statistik() { //current statistics of  run
    return {
      limit: this.limit,
      parallel: this.parallel,
      errorlimit : this.errorlimit,
      notReady: this.running-this.collector.length,  //number still in work
      openrun: [...this.open.keys()],  // ids which are still running (oldest first)
      finished: this.collector.length, //number of finished
      errors: this.errcollector.length,  //number of errors
      lastStarted: this.running,  //last id which was started
      sleeps: this.sleeper,  //number of sleep functions which are blocking
      //cpu: this.startUsage=process.cpuUsage(this.startUsage)
    };

  }
}

module.exports=function factory(options){

 return new Controller(options);
};