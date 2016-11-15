"use strict";


const debug = require("debug")("controller1");


class Controller2 extends require("promise-command") {
    constructor(param) {
        super(param);
        this.started = [0, 0];
    }
    errHandler(pos, err) {
        //            debug("error",err,pos);
        if (pos.diff[0] > 2) {
            Object.assign(pos, {
                group: 1
            });
        } else {
            Object.assign(pos, {
                group: 0
            });
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
        if (pos.diff[0] > 2) {
            Object.assign(pos, {
                group: 1
            });

        } else {
            Object.assign(pos, {
                group: 0
            });
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

    makeIteratorInpG(array, dir) {
        let nextIndex = 0;

        return {
            next: function() {
                for (;;) {
                    if (nextIndex < array.length) {
                        const value = array[nextIndex++];
                          //  delete array[nextIndex++];
                        if (value && "input" in value && dir === value.group) {

                            return {
                                value,
                                done: false
                            };
                        }
                    } else {
                        debug("ende iter", dir, nextIndex);
                        return {
                            done: true
                        };
                    }

                }
            }
        };
    }

    *
    dataGenerator(res) {


        const iter1 = this.makeIterator(res);

        const first = yield* this.startAll([],()=>iter1.next());

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
