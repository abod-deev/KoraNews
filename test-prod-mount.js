import { JSDOM, VirtualConsole } from 'jsdom';
const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (e) => console.log("JSDOM ERROR:", e));
virtualConsole.on("jsdomError", (e) => console.log("JSDOM JSDOM_ERROR:", e.message));
virtualConsole.on("log", (e) => console.log("JSDOM LOG:", e));
JSDOM.fromURL("http://localhost:3001/", { runScripts: "dangerously", resources: "usable", virtualConsole }).then(dom => {
  setTimeout(() => {
    console.log("HTML length:", dom.window.document.body.innerHTML.length);
    process.exit(0);
  }, 4000);
});
