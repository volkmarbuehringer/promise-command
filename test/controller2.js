"use strict";


const debug = require("debug")("controller1");
const moment = require("moment");

class Controller2 extends require("promise-command") {
  constructor(param) {
    super(param);
    this.errprob = 0.0001;
    this.collector = [];

        this.removed=new Map();
    setInterval(this.checkRunning.bind(this),
      1000,  (entry)=>{
        //debug("longest",entry);
        if ( entry[0].diff[0]>7  ){ //runs to long
          debug("remove %d",this.removed.size,entry[0]);
          this.removed.set( entry[0],entry[1]);
          return true;
        } else {
         return false;
        }

      },1).unref();

    }
  errHandler(pos, err,input) {
    debug("error",err,pos);
    if ( this.removed.delete(pos)){
      debug("hier noch geliefert err",pos);
    }
    this.collector.push(input);


    if ( this.errcollector.size > 300 ){
      return true;
    } else {
      return false;
    }

  }
  objHandler(pos, obj,input) { //add timing
    //debug("hier da",pos,obj);
    /*
    this.collector[pos.id] = Object.assign(obj, {
      diff: process.hrtime(pos.start)
    }); //store endresult in order of start like Promise.all
*/
if ( this.removed.delete(pos)){
  debug("hier noch geliefert",pos);
}
this.collector.push(input);

  }
  endHandler(){
    if (this.errcollector.size > 30) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector.values()]);
        } else { // return the array of results
      debug("finished with gen: %d", this.removed.size);
          this.emit("ende", null,this.collector);
    }

  }

  *
  dataGenerator(res) {
   let  now = moment.now("X");
    for (let i = 0; i < 30; i++) {

        if ( i> 0){
            //  yield* this.waiter(10000 - (moment.now("X") - now));
              debug("itermediatore",this.collector.length);
          res = this.collector;
          this.collector=[];

        }

      yield* this.startAll(res);

     now = moment.now("X");
   }


  }
}

module.exports=Controller2;
