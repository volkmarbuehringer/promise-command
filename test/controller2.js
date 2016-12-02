"use strict";

const util = require("util");
util.inspect.defaultOptions.colors = true;
// Debug wird mit NODE_DEBUG="controller" im Environment eingeschaltet
const debug = util.debuglog("controller2");

class Controller2 extends require("promise-command") {
  constructor(param) {
    super(param);
    this.started = [0, 0];
    this.res=[];
    this.agent=require("http").globalAgent;
    setInterval(this.checkRunning.bind(this), 1000,8).unref();

  }
  errHandler(pos, error) {
     Object.assign( pos,{error});
     debug(pos);
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

      const first = yield* this.startAll(this.res, () => iter1.next());

      const r = yield* this.waiterFinished(1000000, true);
      first.push(...r);
      const x = Math.floor(first.length / 2);

      const co = (a) => a ? a.duration[0] * 1e9 + a.duration[1] : 0;

      first.sort((a, b) => co(a) - co(b));
      const median = first[x];
      debug("median %d %j min %j max %j", x, median, first[0], first[first.length - 2]);
      const testFun1 = (a) => a ? this.timeCompare(a.duration, 0, co(median)) : true;
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
      const l = yield* this.waiterFinished(30000, true);
      debug("ende hier %d", l.length);

      return next;

    } catch (err) {
      debug("error generator", err);
    }


  }

  checkRunning( tim){
    const erg = super.checkRunning(tim);
    erg.forEach((x) => {
        const url = x.input.url.replace("http://","")+":80:";

      const socker = this.agent.sockets[url];
      if (socker && Array.isArray(socker) && socker.length === 1) {
        const sock = socker[0];
            //debug("sock",sock);
        Object.assign(x, {socket: {connecting: sock.connecting, reading: sock.reading, writing: sock.writing,
        bytes: sock._handle?sock._handle.bytesRead:null}});

        if (sock.connecting && sock._handle.bytesRead === 0) {
          if ( this.parallel < this.parallelsave*2 ){
            this.parallel++;
          }
        }
      }
    });
    return erg;

  }



}

module.exports = Controller2;
