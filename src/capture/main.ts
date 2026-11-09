import "./style.css";
import { initCaptureBridge } from "./bridge";
import { initCaptureForm } from "./form";

let cleanups: (() => void)[] = [];
const stop = () => { cleanups.forEach((cleanup) => cleanup()); cleanups = []; };
const start = () => { stop(); cleanups = [initCaptureBridge(), initCaptureForm()]; };
start();
window.addEventListener("pagehide", stop);
window.addEventListener("pageshow", (event) => { if (event.persisted) start(); });
