import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (e) => {
  console.log("JSDOM ERROR:", e);
});
virtualConsole.on("jsdomError", (e) => {
  console.log("JSDOM JSDOM_ERROR:", e.message);
});
virtualConsole.on("warn", (e) => {
  console.log("JSDOM WARN:", e);
});
virtualConsole.on("log", (e) => {
  console.log("JSDOM LOG:", e);
});

JSDOM.fromURL("http://localhost:3000/", {
  runScripts: "dangerously",
  resources: "usable",
  virtualConsole
}).then(dom => {
  setTimeout(() => {
    console.log("HTML:", dom.window.document.body.innerHTML);
    process.exit(0);
  }, 3000);
}).catch(e => {
  console.error("Fetch error:", e);
  process.exit(1);
});
