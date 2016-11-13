"use strict";


const pino = require("pino")();
const Controller1 = require("./controller1.js");

setInterval(() => pino.info(controller.statistik(), "statistik"), 5000).unref();

process.on("unhandledRejection", (reason, p) => {
  pino.error(reason, "Unhandled Rejection at: Promise", p);
  // application specific logging, throwing an error, or other logic here
});


//function for test purposes, uses tester function from controller

const crawler =
  (obj) => Promise.resolve(obj)
  .then((obj) => {
    obj.message = null;
    obj.count=(obj.count||0)+1;
    return obj;
  })
  .then((obj) => controller.tester(obj));

const controller = new Controller1({
  parallel: 80,
  limit: 10000,
  fun: crawler
});


// user supplied generator function, which iterates 2 times over the test array and pauses


//main code
Promise.resolve()
  .then(() => {
    controller.daten = [];
    let count = 1000;
    if (process.argv.length === 3) {
      count = parseInt(process.argv[2]);
    }
    for (let i = 0; i < count; i++) {
      controller.daten.push({
        id: i
      });
    }

    return controller.daten;
  })
  .then((res) => controller.runner(res))
  .then((x) => {
    pino.info(x, "finished");
  })
  .catch((err) => {
    pino.error(err, "exit with error");
  });
