"use strict";

const debug = require("debug")("controller");
const EventEmitter = require("events");


class Controller extends EventEmitter {
  constructor(param) {
    super();
    const {
      parallel,
      fun
    } = param;
    this.sleeper = 0;
    this.open = new Set();
    this.running = 0;
    this.finished = 0;
    this.fun = fun;
    this.parallel = parallel || 20;
    this.parallelsave = this.parallel;
    this.errcollector = new Set();

    this.errprob = 0;
  }
  errHandler(pos, err) {
    return true; // exit on error
  }
  objHandler(pos, obj) {
    return obj;
  }

  *
  startOne(fun, input) { //start function with object and supply event emit after end

    if (!fun && typeof fun !== "function") {
      throw new Error("no function");
    }

    const temp = {
      id: this.running++,
      start: process.hrtime(),
      fun,
      input
    };

    this.open.add(temp); //store running object
    return yield fun(input)
      .then((res) => this.emit("arbeiten", null, res, temp)) // emit result
      .catch((err) => this.emit("arbeiten", err, null, temp)) // emit error
    ;


  }

  timeCompare(a, minTim, maxTim) {
    const r = a[0] * 1e9 + a[1];
    if (r >= minTim && r < maxTim) {
      return true;
    } else {
      return false;
    }
  }


  makeIteratorFun(array, testFun, funs) {
    let nextIndex = 0;
    let idxPos = 0;

    return {
      next: function () {
        for (;;) {
          if (nextIndex < array.length) {
            let value = array[nextIndex];

            //                      console.error("vordel",value,nextIndex,array.length,array[nextIndex]);
            //                        console.error("nachdel",value,nextIndex,array.length,array[nextIndex],testFun);
            if (value && (!testFun || testFun(value))) {

              if (!("input" in value) && funs) {

                const fun = funs[idxPos];
                if (++idxPos >= funs.length) {
                  idxPos = 0;
                  delete array[nextIndex++];
                }
                value = {
                  input: value,
                  fun

                };

              } else {
                delete array[nextIndex++];

              }
              return {
                value,
                done: false
              };


            }

          } else {
            debug("ende iter", nextIndex);
            return {
              done: true
            };
          }

        }
      }
    };
  }

  *
  startAll(first, fun, limit = 99999999) {

    let la = null;

    for (;;) {

      if (this.open.size >= this.parallel) {
        la = yield Promise.resolve();
      } else {

        const next = fun(la);

        if (next.done) {
          debug("ende iter");
          break;

        } else {
          const fun = next.value.fun || this.fun;
          la = yield* this.startOne(fun, next.value.input || next.value);
        }
      }
      if (la) {
        if (first.push(la) >= limit) {
          debug("ende wegen limit");
          break;
        }


      }
    }
    return first;
  }


  *
  waiterFinished(starttim, emptyFlag = false) { //block with a sleep function, if starttime is not yet reached
    const timeouter = (p) => new Promise((resolve) => setTimeout(resolve, p).unref());
    const r = [];
    if ((this.sleepval = starttim) > 0) {
      this.sleeper++;
      r.push(yield timeouter(this.sleepval)
        .then(() => this.emit("arbeiten"))); // after sleeping emit event
      while (this.sleeper) {
        if (emptyFlag === false || this.open.size > 0) {
          r.push(yield Promise.resolve());
        } else {
          this.sleeper--;
        }
      }

    }
    return r;
  }



  endHandler() {
      if (this.errcollector.size > 0) { //throw with error
        debug("finished with error %d", this.errcollector.size);
        this.emit("ende", [...this.errcollector]);
      } else { // return the array of results
        debug("finished with gen");
        //return Promise.resolve(this.collector);
        this.emit("ende", null, []);
      }

    }
    /* run controlled by a generator function, which supplies the promises*/

  setEndFlag() {
    this.parallel = -90000;
    this.parallelsave = -90000;
  }
  waiterEnd(err, obj, pos) {

    if (err) {
      debug("caughterr %d", this.errcollector.size, err, obj, pos);
      //store error

      this.errcollector.add(err); //user handling of error
      if (this.errHandler(Object.assign(pos, {
          diff: process.hrtime(pos.start)
        }), err)) { //too many errors
        this.setEndFlag();
      }
    }
    if (pos !== undefined) {
      // debug("caught", pos, obj);

      if (obj) {
        this.objHandler(Object.assign(pos, {
          diff: process.hrtime(pos.start)
        }), obj); //user handling of result
      }

      this.open.delete(pos); //remove from map of running
      this.finished++;
    } else if (this.sleeper > 0) { // no work, only sleep function
      this.sleeper--;
    }

    //check for endcondition of the run
    this.run(pos);

    if (this.sleeper === 0 && this.open.size === 0 &&
      (this.done || this.parallel <= 0)) {
      return this.endHandler();
    }


  }


  run(ne) {


    while (!this.done) {
      //  debug("starting %d %d %d", this.open.size, this.done, this.running);
      const done = this.startgen.next(ne);
      if (this.sleeper || this.open.size >= this.parallel) {
        break;
      }
      ne = null;
      if (!this.done) {
        this.done = done.done;
      }

    }

  }


  *
  dataGenerator(res) {

    return yield* this.startAll([], this.makeIteratorFun(res, null));


  }


  runner(iterator) {
    // wait for finished promise,
    // catch the promise after run and do end handling of the promise

    // fetch promises from generator with limited parallelism


    return Promise.resolve()
      .then(() => {
        this.done = false;
        this.startgen = this.dataGenerator(iterator);
        this.on("arbeiten", this.waiterEnd.bind(this));
        this.run(null);

        return new Promise((resolve, reject) => this.once("ende", (err, result) => {
          this.removeAllListeners("arbeiten");

          return err ? reject(err) :
            resolve(result);

        }));

      });
  }


  tester(x, mult) { // supply test function
    const val = Math.random() * mult;
    return new Promise((resolve, reject) => setTimeout(() => {
      if (Math.random() < this.errprob) {
        return reject({
          message: "kaputti" + this.running
        });
      } else {
        return resolve(Object.assign(x, {
          val
        }));
      }
    }, val));
  }

  checkRunning(limit, limit1) {
    this.parallel = this.parallelsave;
    let i = 0;
    this.slow = null;
    for (const entry of this.open) {
      const tim = process.hrtime(entry.start);
      Object.assign(entry, {
        diff: tim
      });
      if (i === 0) {
        this.slow = entry;
      }
      if (tim[0] < limit || (limit === 0 && tim[1] < limit1)) {
        break;
      }
      i++;
    }
    if (i > 0) {
      return ([...this.open].slice(0, i));
    } else {
      return [];
    }

  }

  statistik() { //current statistics of  run

    return {
      parallel: this.parallel,
      finished: this.finished,
      lastStarted: this.running, //last id which was started
      slowest: this.slow,

      //    openrun: [...this.open.keys()], // ids which are still running (oldest first)
      size: this.open.size,
      errors: this.errcollector.size, //number of errors

      sleeps: this.sleeper, //number of sleep functions which are blocking
      done: this.done,
      cpu: this.startUsage = process.cpuUsage(this.startUsage)
    };

  }
}

module.exports = Controller;
