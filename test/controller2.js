"use strict";


const debug = require("debug")("controller1");


class Controller2 extends require("promise-command") {
    constructor(param) {
        super(param);
        this.started=[0,0];
      }
    errHandler(pos, err) {
//            debug("error",err,pos);
        if ( pos.diff[0] > 2){
          Object.assign(pos,{group:1});
        } else {
            Object.assign(pos,{group:0});
        }
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
    if ( pos.diff[0] > 2){
      Object.assign(pos,{group:1});

    } else {
          Object.assign(pos,{group:0});
    }
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
/*
      function makeIterator(array,border,dir){
          let nextIndex = 0;

          return {
             next: function(){
                 for ( ;nextIndex < array.length &&
                   ( array[nextIndex].diff === null ||
                     (array[nextIndex].diff[0] <= border && dir === 0)||
   (array[nextIndex].diff[0]> border && dir === 1))
                   ;nextIndex++ ){
                 }
                 if (nextIndex < array.length){
                   array[nextIndex].diff=null;
                   return {value: array[nextIndex], done: false} ;
                 } else {
                   return      {done: true};
                 }



             }
          };
      }

let iterslow = makeIterator(res,6,0);
        for (let i = 0; i < 30; i++) {

const iterfast = makeIterator(res,999,1);

            yield* this.startAll(iterfast);

debug("neue runde",i);

        }
*/


const first=  yield* this.startAll(this.makeIterator(res));
/*
let la;

const that=this;
const helper=function*(z,i){
  that.started[z]++;
  la = yield* that.startOne(that.fun, first[i].input);
  delete first[i];
};
let zahl0=0,zahl1=0;
for (let i=0; i< first.length;i++){
  if ( first[i] && first[i].group === 0){
      zahl0++;
  } else    if ( first[i] && first[i].group === 1){
    zahl1++;
  }
}
debug("start wiederhol mit %d %d %d",first.length,zahl0,zahl1);

for(let i=0,j=0;  ;){
    if ( la){
      first.push(la);
      if ( la.group === 0 ){
        for( ; i < first.length;i++){
          if ( first[i] && first[i].group === 0){
            yield *helper(0,i);
            break;
          }
        }
      } else {
        for( ; j < first.length;j++){
          if ( first[j] && first[j].group === 1){
          yield *helper(1,j);
            break;
          }
        }
      }
    } else {
      for( ;i < first.length;i++){
        if ( first[i] && first[i].group === 0){
          yield *helper(0,i);
          break;
    }}
    }

}
*/

  let next=first;
  for (let i = 0; i < 30; i++) {

        //  yield* this.waiter(10000 - (moment.now("X") - now));
      debug("itermediatore %d %d",i, next.length);
      next=  yield* this.startAll(this.makeIteratorInp(next));

  }


    }
}

module.exports = Controller2;
