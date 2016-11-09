"use strict";


const debug = require("debug")("controller1");


class Controller2 extends require("promise-command") {
  constructor(param) {
    super(param);
    this.errprob = 0.0001;
    this.collector = [];

    setInterval(this.checkRunning.bind(this),
      1000,  (entry)=>{

        if ( entry[0].diff[0]<=5  ){ //runs to long
                                  return true;
        } else {

                this.parallel++;
                return false;
        }

      }).unref();

    }
  errHandler(pos, err,input) {
//    debug("error",err,pos);

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
this.collector.push(input);

  }
  endHandler(){
    if (this.errcollector.size > 30) { //throw with error
      debug("finished with error %d", this.errcollector.size);
      this.emit("ende", [...this.errcollector.values()]);
        } else { // return the array of results
      debug("finished with gen" );
          this.emit("ende", null,this.collector);
    }

  }

  *
  dataGenerator(res) {

    for (let i = 0; i < 30; i++) {

        if ( i> 0){
            //  yield* this.waiter(10000 - (moment.now("X") - now));
              debug("itermediatore",this.collector.length);
          res = this.collector;
          this.collector=[];

        }

      yield* this.startAll(res);


   }


  }
}

module.exports=Controller2;
