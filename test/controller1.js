"use strict";


const debug = require("debug")("controller1");
//const moment = require("moment");

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

    if (pos.diff[0] > 0) {
        Object.assign(pos, {
            group: 1
        });
    } else {
        Object.assign(pos, {
            group: 0
        });
    }

    if (this.errcollector.size > 30) {
      return true;
    } else {
      return false;
    }
  }
  objHandler(pos, obj) { //add timing
    //debug("hier da",pos,obj);

    if (pos.diff[0] > 0) {
        Object.assign(pos, {
            group: 1
        });

    } else {
        Object.assign(pos, {
            group: 0
        });
    }

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

/*
    const iter2 = this.makeIteratorInp(first);
    const next= yield* this.startAll(first,()=>iter2.next(),10000);

    debug("am ende",next.length);

    const r = yield* this.waiterFinished(500000);

    debug("ganz am ende",r.length);
*/

let zahl0 = 0,
    zahl1 = 0;
for (let i = 0; i < first.length; i++) {
    if (first[i] && first[i].group === 0) {
        zahl0++;
    } else if (first[i] && first[i].group === 1) {
        zahl1++;
    }
}
debug("start wiederhol mit %d %d %d", first.length, zahl0, zahl1);

let iter = [this.makeIteratorInpG(first, 0), this.makeIteratorInpG(first, 1)];

const next = yield* this.startAll(first,(la)=>{
let next;
if ( !la){
la = {};
}
for (let i = 0; i < 2; i++) {
next = iter[la.group || 0].next();
             if (!next.done){
               this.started[la.group || 0]++;
               return next;
             } else {
               if (la.group) {
                   la = {
                       group: 0
                   };
               } else {
                   la = {
                       group: 1
                   };
               }


             }
}


  return next;
});


}

}
module.exports = Controller1;
