"use strict";


const debug = require("debug")("tester1");
const moment = require("moment");

class Controller1 extends require("../lib/controller.js") {
  constructor(param) {
    super(param);
    this.errprob = 0.01;
    this.collector = [];
    
        this.removed=[];
    setInterval(this.checkRunning.bind(this),
      1000,  (entry)=>{
        //debug("longest",entry);
        if ( entry[0].diff[0]>0 || entry[0].diff[1]>2e8 ){ //runs to long
          debug("remove %d",this.removed.length,entry[0]);
          this.removed.push( entry[1]);
          return true;
        } else {
         return false;
        }

      },1).unref();

    }
  errHandler(pos, err) {
    debug("error",err,pos);
    delete this.daten[pos.pos];
    if ( this.errcollector.size > 30 ){
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
this.collector.push(input);

  }
  endHandler(){
    if (this.errcollector.size > 30) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector.entries()]);
        } else { // return the array of results
      debug("finished with gen");
          this.emit("ende", null,this.collector);
    }

  }

  *
  dataGenerator(res) {
   let  now = moment.now("X");
    for (let i = 0; i < 30; i++) {

        if ( i> 0){
              yield* this.waiter(10000 - (moment.now("X") - now));
              debug("itermediatore",this.collector.length);
          res = this.collector;
          this.collector=[];

        }

      yield* this.startAll(res);

     now = moment.now("X");
    }


  }
}

module.exports=Controller1;
