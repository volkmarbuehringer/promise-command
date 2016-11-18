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


        const iter1 = this.makeIterator(res);

        const first = yield* this.startAll([],()=>iter1.next());

        const r= yield *this.waiter(10000);
        first.push(...r);
      const x = Math.floor(first.length/2);

      debug("vor sort %d",first.length );

      const co=(a)=>a?a.diff[0]*1e9+a.diff[1]:0;

          first.sort((a,b)=>co(a)-co(b));
          debug("median %d %j min %j max %j",x,first[x],first[0],first[first.length-2]);
const testFun1=(a)=>this.timeCompare(a.diff,0,first[x]);
const testFun2=(a)=>!this.timeCompare(a.diff,0,first[x]);

        let iter = [this.makeIteratorFun(first,testFun1 ), this.makeIteratorFun(first, testFun2)];

const next = yield* this.startAll(first,(la)=>{
  if ( !la){
    la = {};
  }
  let group;
  if ( testFun1(la)){
    group = 0;
  } else  {
    group = 1;
  }
  let next;
  for (let i = 0; i < 2; i++) {
    next = iter[group].next();
                     if (!next.done){
                              this.started[group]++;
                       return next;
                     } else {
                       if (group) {
                               group=0;
                       } else {
                               group=1;
                       }
                     }
}
return next;
});

return next;

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
