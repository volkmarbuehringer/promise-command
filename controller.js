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
      errorlimit
    } = param;
    this.sleeper=0;
    this.open = new Map();
    this.running = 0;
    this.limit = limit || 999999999;
    this.parallel = parallel || 20;
    this.collector = [];
    this.errcollector = [];
    this.errorlimit = errorlimit||1;
  }

startOne( fun,c ){
    const temp = this.running++;

    if (temp >=  this.limit ){
      throw "End";
    }

  this.open.set(temp,c); //store running object
  return fun(c)
    .then((res) => this.emit("arbeiten", null, res,temp))
    .catch((err) => this.emit("arbeiten", err));


}

*startAll( webber,fun){
  this.sleepval=null;
  for ( const c of  webber) {
    yield this.startOne(fun,c);

    }
  }



*waiter(starttim){
  const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p));

  if ((this.sleepval = (starttim - moment.now("X"))) > 0) {
    this.sleeper++;
    yield timeouter(this.sleepval)
      .then(() => this.emit("arbeiten"));
  }

}


  runner(startgen) {

    const waiter = () => new Promise((resolve, reject) => this.once("arbeiten", (err, result,pos) =>err ? reject({err,pos})
    : resolve({result, pos  })))
    .then((obj) => {

      debug("nach ausfür",  obj);

    if (obj.pos) {
        if (this.collector[obj.pos] !== undefined ){
          throw new Error("internal err");
        }
        this.collector[obj.pos]= obj.result;
          this.open.delete( obj.pos);
      } else{
        this.sleeper--;
      }

      return run(this.running);
    })
    .catch((err) => {
      debug("fehler", err);
        this.open.delete(err.pos);
          this.errcollector.push(err);

          if (this.errcollector.length >= this.errorlimit ) {
              this.parallel = 0; //stop working
          }

        return run(this.running);
    });

    const run = (iter) => Promise.resolve()
      .then(() => {

        while ( this.sleeper === 0 && this.open.size < this.parallel && ! startgen.next().done) {
          debug("starting");
        }

        if ( this.sleeper === 0 && this.open.size === 0) {
          debug("ablauf fertig",this.collector.length);
          if (this.errcollector.length >= this.errorlimit ) {
            throw this.errcollector;
          } else {
            return Promise.resolve(this.collector);
          }

        } else {
          if ( iter === this.running){
            debug("leerlauf", iter);
          }
            return waiter();
      }
      })
          ;

    return run(this.running);

  }

  statistik() {
    return {
      limit: this.limit,
      parallel: this.parallel,
      offen: this.running-this.collector.length,
      openrun: [...this.open.keys()],
      gesamt: this.collector.length,
      fehler: this.errcollector.length,
      pos: this.running,
      sleep: this.sleeper,
      //cpu: this.startUsage=process.cpuUsage(this.startUsage)
    };

  }
}

module.exports=function factory(options){

 return new Controller(options);
};
