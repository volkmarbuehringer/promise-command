"use strict";


const debug = require("debug")("controller1");

class Controller2 extends require("promise-command") {
  constructor(param) {
    super(param);
    this.started = [0, 0];
  }
  errHandler(pos, err) {
    //            debug("error",err,pos);
    if (this.errcollector.size > 300) {
      return true;
    } else {
      return false;
    }

  }
  objHandler(pos, obj) { //add timing
    //debug("hier da",pos,obj);
    /*
    ; //store endresult in order of start like Promise.all
*/
  }
  endHandler() {
    if (this.errcollector.size > 300) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector]);
    } else { // return the array of results
      debug("finished with gen");
      this.emit("ende", null, []);
    }

  }


  *
  dataGenerator(res) {

    try {
      const iter1 = this.makeIteratorFun(res, null);

      const first = yield* this.startAll([], () => iter1.next());

      const r = yield* this.waiterFinished(1000000, true);
      first.push(...r);
      const x = Math.floor(first.length / 2);

      const co = (a) => a ? a.diff[0] * 1e9 + a.diff[1] : 0;

      first.sort((a, b) => co(a) - co(b));
      const median = first[x];
      debug("median %d %j min %j max %j", x, median, first[0], first[first.length - 2]);
      const testFun1 = (a) => a ? this.timeCompare(a.diff, 0, co(median)) : true;
      const testFun2 = (a) => !testFun1(a);

      let iter = [this.makeIteratorFun(first, testFun1), this.makeIteratorFun(first, testFun2)];
      const modder = (la) => {
        let group = testFun1(la) ? 0 : 1;

        let next;
        for (let i = 0; i < 2; i++) {
          next = iter[group].next();
          //        debug("hier",next,la,group);
          if (!next.done) {
            this.started[group]++;
            return next;
          } else {
            group = group ? 0 : 1;
          }
        }
        return next;
      };
      const next = yield* this.startAll(first, modder, 3000);

      debug("warte auf ende");
      const l = yield* this.waiterFinished(300000, true);
      debug("ende hier %d", l.length);

      return next;

    } catch (err) {
      debug("error generator", err);
    }

    /*
      let next=first;
      for (let i = 0; i < 30; i++) {

            //  yield* this.waiter(10000 - (moment.now("X") - now));
          debug("itermediatore %d %d",i, next.length);


          next=  yield* this.startAll(this.makeIteratorInp(next));

             if (  next < 20 ){
              do{
              const r=yield* this.waiter(20000 );
              debug("warten",i, r.length);

              next=next.concat(r);
            }while ( next.length === 0);
            }

      }
    */

  }
}

module.exports = Controller2;
