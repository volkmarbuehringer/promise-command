"use strict";


const debug = require("debug")("test14");
const moment = require("moment");
const pino = require("pino")();

const controller =require("../lib/controller.js")({
  parallel: 30,
  limit: 3000,
  errorlimit: 100
});



setInterval(() => pino.info(controller.statistik(), "statistik"), 5000).unref();

process.on("unhandledRejection", (reason, p) => {
  pino.error(reason, "Unhandled Rejection at: Promise", p);
  // application specific logging, throwing an error, or other logic here
});



//function for test purposes, uses tester function from controller

const crawler =
  (obj) => Promise.resolve(obj)
  .then((obj) => {
    obj.start = moment.now("X");
    obj.message = null;

    return obj;
  })
  .then((obj) =>  controller.tester(obj)
  .then(()=>Object.assign(obj,{ ende: moment.now("X")}))
  )
;


// user supplied generator function, which iterates 2 times over the test array and pauses

function *starter(res,  dann=moment.now("X")) {

 try{
   for (let i = 0; i < 2; i++) {
       yield *controller.waiter(dann + i * 200000);
       yield *controller.startAll(res,crawler);
   }
 }
 catch( e){
   if ( e !== "End"){
     throw e;
   }
 }

}

//main code
Promise.resolve()
  .then(() => {  const daten=[];
    let count=1000;
    if ( process.argv.length === 3){
      count=  parseInt(process.argv[2]);
    }
    for ( let i=0; i < count; i++){
      daten.push( {
        id: i
      });
    }
    return daten;
  })
  .then((res) => controller.runner(starter(res)))
  .then((x) => {
    pino.info(x, "finished");
    })
  .catch((err) => {
      pino.error(err, "exit with error");
  });
