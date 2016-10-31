"use strict";

const debug = require("debug")("controller");
const moment = require("moment");

const EventEmitter = require("events");



class Controller extends EventEmitter {
  constructor(param) {
    super();
    const {
      parallel,
      limitges
    } = param;
    this.open = 0;
    this.running = 0;

    this.limitges = limitges || 999999999;

    this.parallel = parallel || 20;
    this.collector = [];
    this.errcollector = [];

  }

*startarr( webber,fun){
  this.sleepval=null;
  for ( const c of  webber) {
    const zwischen = this.running;
    yield fun(c)
      .then((res) => this.emit("arbeiten", null, res,zwischen))
      .catch((err) => this.emit("arbeiten", err));

      if ( ++this.running >=  this.limitges ){
        return;
      }
  }

}

*warten(starttim){
  const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p));

  while ((this.sleepval = (starttim - moment.now("X"))) > 0) {
    yield timeouter(this.sleepval)
      .then(() => this.emit("arbeiten"));
  }

}


  runner(startgen) {

    const waiter = () => new Promise((resolve, reject) => this.once("arbeiten", (err, result,pos) =>err ? reject(err)
    : resolve({result, pos  })))
    .then((obj) => {

      debug("nach ausfür",  obj);

    if (obj.pos) {
        if (this.collector[obj.pos] !== undefined ){
          throw new Error("internal err");
        }
        this.collector[obj.pos]= obj.result;

      }
      this.open--;
      return run(this.running);

    })
    .catch((err) => {
      debug("fehler", err);
        this.open--;
        this.parallel = 0;
        this.errcollector.push(err);
        return run(this.running);


    });


    const run = (iter) => Promise.resolve()
      .then(() => {
        while ( this.open < this.parallel && ! startgen.next().done) {
            this.open++;
        }

        if ( this.open <= 0) {
          debug("ablauf fertig",this.collector.length);
          if (this.errcollector.length) {
            throw this.errcollector[0];
          } else {
            return Promise.resolve(this.collector);
          }

        } else {
          if ( iter === this.running){
            debug("leerlauf", iter);
          }
            return waiter()
          ;
      }
      })
          ;

    return run(this.running);

  }

  statistik() {
    return {
      offen: this.running-this.collector.length,
      openrun: this.open,
      gesamt: this.collector.length,
      fehler: this.errcollector.length,
      pos: this.running,
      sleep: this.sleepval
    };

  }
}

module.exports=function factory(options){

  const controller = new Controller(options);
 return controller;
};
