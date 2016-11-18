"use strict";


const debug = require("debug")("controller1");
//const moment = require("moment");

const co=(a)=>a?a.diff[0]*1e9+a.diff[1]:0;

class Controller1 extends require("../lib/controller.js") {
  constructor(param) {
    super(param);
    this.errprob = 0.0001;
    this.collector=[];
        this.started = [0, 0];


    setInterval(() => {
  //    const erg = this.checkRunning(0,2E8);
  const erg = this.checkRunning(1);

      debug("longest %j %d",this.started, erg.length);
      this.parallel += erg.length;

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

try {
    const iter1 = this.makeIteratorFun(res,null);

    let first = yield* this.startAll([],()=>iter1.next());

/*
    const iter2 = this.makeIteratorInp(first);
    const next= yield* this.startAll(first,()=>iter2.next(),10000);

    debug("am ende",next.length);

    const r = yield* this.waiterFinished(500000);

    debug("ganz am ende",r.length);
*/
  const r= yield *this.waiter(3000);


  first.push(...r);


const x = Math.floor(first.length/2);

debug("vor sort %d",first.length );

    first.sort((a,b)=>co(a)-co(b));
    debug("median %d %j min %j max %j",x,first[x],first[0],first[first.length-2]);

    const co = (a) => a ? a.diff[0] * 1e9 + a.diff[1] : 0;

    const median = first[x];
    const testFun1 = (a) => this.timeCompare(a.diff, 0, co(median));
    const testFun2 = (a) => !this.timeCompare(a.diff, 0, co(median));

    let iter = [this.makeIteratorFun(first, testFun1), this.makeIteratorFun(first, testFun2)];

    const next = yield* this.startAll(first, (la) => {
      let group;
      if (!la) {
        group = 0;
      } else {
        group=testFun1(la)?0:1;
      }
      let next;
      for (let i = 0; i < 2; i++) {
        next = iter[group].next();
//        debug("hier",next,la,group);
        if (!next.done) {
          this.started[group]++;
          return next;
        } else {
          group=group?0:1;
        }
      }
      return next;
    });
    return next;
}catch(err){
  debug("error generator",err);
}


}

}
module.exports = Controller1;
