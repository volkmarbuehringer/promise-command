"use strict";


const debug = require("debug")("controller1");
const moment = require("moment");

class Controller1 extends require("../lib/controller.js") {
  constructor(param) {
    super(param);
    this.errprob = 0.0001;
    this.collector = [];

    setInterval(() => {
      const erg = this.checkRunning(0,2E8);

      debug("longest %d", erg.length);
      this.parallel += erg.length;

    }, 1000).unref();

  }
  errHandler(pos, err) {
    debug("error", err, pos);
    delete this.daten[pos.pos];
    if (this.errcollector.size > 30) {
      return true;
    } else {
      return false;
    }
  }
  objHandler(pos, obj, input) { //add timing
    //debug("hier da",pos,obj);
    /*
    this.collector[pos.id] = Object.assign(obj, {
      diff: process.hrtime(pos.start)
    }); //store endresult in order of start like Promise.all
*/
    this.collector.push(input);

  }
  endHandler() {
    if (this.errcollector.size > 30) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector.entries()]);
    } else { // return the array of results
      debug("finished with gen");
      this.emit("ende", null, this.collector);
    }

  }

  *
  dataGenerator(res) {
    let now = moment.now("X");
    for (let i = 0; i < 30; i++) {

      if (i > 0) {
        //  yield* this.waiter(10000 - (moment.now("X") - now));
        debug("itermediatore", this.collector.length);
        res = this.collector;
        this.collector = [];

      }

      yield* this.startAll(res);

      now = moment.now("X");
    }


  }
}

module.exports = Controller1;
