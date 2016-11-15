"use strict";


const debug = require("debug")("controller1");
//const moment = require("moment");

class Controller1 extends require("../lib/controller.js") {
  constructor(param) {
    super(param);
    this.errprob = 0.0001;
    this.collector=[];

/*
    setInterval(() => {
  //    const erg = this.checkRunning(0,2E8);
  const erg = this.checkRunning(1);

      debug("longest %d", erg.length);
      this.parallel += erg.length;

    }, 1000).unref();
*/
  }
  errHandler(pos, err) {
    debug("error", err, pos);

    if (this.errcollector.size > 30) {
      return true;
    } else {
      return false;
    }
  }
  objHandler(pos, obj) { //add timing
    //debug("hier da",pos,obj);
    this.collector[pos.input.id]=obj;


  }
  endHandler() {
    if (this.errcollector.size > 30) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector]);
    } else { // return the array of results
      debug("finished with gen");
      this.emit("ende", null, this.collector);
    }

  }

  *
  dataGenerator(res) {

    const iter1 = this.makeIterator(res);

    const first = yield* this.startAll([],()=>iter1.next());
    const iter2 = this.makeIteratorInp(first);
    const next= yield* this.startAll(first,()=>iter2.next(),10000);

    debug("am ende",next.length);

    const r = yield* this.waiterFinished(500000);

    debug("ganz am ende",r.length);
  return next;
  }
}

module.exports = Controller1;
