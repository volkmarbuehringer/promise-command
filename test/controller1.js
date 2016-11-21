"use strict";


const debug = require("debug")("controller1");
//const moment = require("moment");

class Controller1 extends require("../lib/controller.js") {
  constructor(param) {
    super(param);
    this.errprob = 0.0001;
    this.collector = [];

    setInterval(() => {
      //    const erg = this.checkRunning(0,2E8);
      const erg = this.checkRunning(5);

      debug("longest %d", erg.length);
      //  this.parallel += erg.length;

    }, 1000).unref();

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

    this.collector[pos.input.id] = obj;

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

    try {
      const iter1 = this.makeIteratorFun(res, null, this.fun);

      let first = yield* this.startAll(res, () => iter1.next(), 30000);

      debug("warte auf ende");
      const l = yield* this.waiterFinished(3000, true);
      debug("ende hier %d", l.length);

      return first.concat(l);
    } catch (err) {
      debug("error generator", err);
    }


  }

}
module.exports = Controller1;
