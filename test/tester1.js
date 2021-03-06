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
    return obj;
  })
  .then((obj) => controller.tester(obj,2100));

  const crawler1 =
    (obj) => Promise.resolve(obj)
    .then((obj) => {
      obj.message = null;
        return obj;
    })
    .then((obj) => controller.tester(obj,5700));

const controller = new Controller1({
  parallel: 80,
  fun: [crawler,crawler1]
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
    controller.destroy();
    pino.info(x, "finished");
  })
  .catch((err) => {
    controller.destroy();
    pino.error(err, "exit with error");
  });
