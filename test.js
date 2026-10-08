const fs=require('fs'),vm=require('vm'),assert=require('assert');
let time=10000,brightness=100,pixel=[200,80,20];
class ClockDate extends Date { static now(){return time;} }
const source=fs.readFileSync(require('path').join(__dirname,'HydroShift_II_S_Native.js'),'utf8').replace(/import LCD[^\n]+\n/,'').replace(/export /g,'');
const ctx={Date:ClockDate,console,LCD:{},device:{enabled:true,getBrightness:()=>brightness,color:()=>pixel,log:()=>{}},ringLevel:50,LightingMode:'Canvas',forcedColor:'#ff8000',enableLCD:false,screenFPS:5,updateMs:1000};
vm.createContext(ctx);
vm.runInContext(source+`
this.sent=[];
upload=function(fs){sent.push(fs.map(f=>f.slice()));};
telemetry=function(){lastTelemetry=Date.now();};
this.bootstrap=function(){ready=true;frames=[];lastUpload=Date.now();lastCapture=0;lastKey='';lastRingControls=ringControls();ringControlPending=false;canvasBlankSince=null;canvasBlankHeld=false;lastTelemetry=Date.now();sent.length=0;};
this.seedOld=function(){frames=[new Array(72).fill(200),new Array(72).fill(80)];};
this.hasOldFrames=function(){return frames.length>0;};
this.run=Render;this.mainChanged=onBrightnessChanged;this.ringChanged=onringLevelChanged;this.colorChanged=onforcedColorChanged;this.shutdown=Shutdown;
`,ctx);
function tick(ms){time+=ms;ctx.run();}
// Zero must clear old frames and send a single black frame before batching.
ctx.bootstrap();ctx.seedOld();ctx.ringLevel=0;ctx.ringChanged();tick(1);
assert.equal(ctx.sent.length,1);assert.equal(ctx.sent[0].length,1);assert(ctx.sent[0][0].every(v=>v===0));
for(let i=0;i<40;i++)tick(50);
assert.equal(ctx.sent.length,1,'Zero brightness was uploaded repeatedly');
// Main brightness zero must win even if the canvas color buffer is still bright.
ctx.ringLevel=50;brightness=100;ctx.bootstrap();ctx.seedOld();brightness=0;ctx.mainChanged();tick(1);
assert.equal(ctx.sent[0].length,1);assert(ctx.sent[0][0].every(v=>v===0));
// A slider drag must not replay the seeded old frames or flood uploads.
brightness=100;ctx.bootstrap();ctx.seedOld();ctx.ringLevel=20;ctx.ringChanged();tick(50);
assert.equal(ctx.sent.length,0);assert.equal(ctx.hasOldFrames(),false);
ctx.ringLevel=40;ctx.ringChanged();tick(50);assert.equal(ctx.sent.length,0);tick(80);
assert.equal(ctx.sent.length,1);assert.equal(ctx.sent[0].length,1);assert.deepEqual(Array.from(ctx.sent[0][0].slice(0,3)),[80,32,8]);
// Repeated notifications of the same value must not restart the debounce.
ctx.bootstrap();ctx.ringLevel=30;ctx.ringChanged();
for(let i=0;i<4;i++){ctx.ringChanged();tick(40);}
assert.equal(ctx.sent.length,1,'Repeated same-value callbacks starved uploads');
// Detection also handles a brightness change when a callback is missed.
ctx.bootstrap();ctx.seedOld();ctx.ringLevel=0;tick(1);assert(ctx.sent[0][0].every(v=>v===0));
// A normal dynamic effect must retain multiple frames.
ctx.ringLevel=50;brightness=100;ctx.bootstrap();
for(let i=0;i<21;i++){pixel=i%2?[200,40,20]:[20,40,200];tick(50);}
assert(ctx.sent[0].length>1,'Normal animation batching was lost');
// Disable/exit with a just-changed zero must not restore the old bright sample.
ctx.bootstrap();ctx.seedOld();ctx.ringLevel=0;ctx.shutdown(false);assert(ctx.sent[0][0].every(v=>v===0));
// Canvas pause leaves brightness unchanged and must replace the old loop.
ctx.ringLevel=50;brightness=100;pixel=[200,40,20];ctx.bootstrap();ctx.seedOld();
pixel=[0,0,0];for(let i=0;i<5;i++)tick(50);
assert.equal(ctx.sent.length,1,'Paused canvas did not promptly stop the onboard loop');
assert.equal(ctx.sent[0].length,1);assert(ctx.sent[0][0].every(v=>v===0));
for(let i=0;i<40;i++)tick(50);assert.equal(ctx.sent.length,1,'Paused canvas repeatedly uploaded black');
// Resume must start with a fresh bright frame, never the paused black tail.
pixel=[100,40,20];tick(50);assert.equal(ctx.sent.length,2);
assert.equal(ctx.sent[1].length,1);assert(ctx.sent[1][0].every(v=>v!==0));
// A pause at the batch deadline must not upload a mixed bright/black loop.
ctx.bootstrap();ctx.seedOld();tick(950);ctx.sent.length=0;pixel=[0,0,0];tick(50);
assert.equal(ctx.sent.length,0,'Black transition committed the stale batch at its deadline');
for(let i=0;i<4;i++)tick(50);
assert.equal(ctx.sent.length,1);assert.equal(ctx.sent[0].length,1);assert(ctx.sent[0][0].every(v=>v===0));
// Short intentional black pulses must still be encoded as a normal animation.
ctx.bootstrap();for(let i=0;i<24;i++){pixel=i%2?[100,40,20]:[0,0,0];tick(50);}
assert(ctx.sent.some(fs=>fs.length>1 && fs.some(f=>f.every(v=>v===0)) && fs.some(f=>f.some(v=>v!==0))),'Short black-pulse effects were suppressed');
console.log('Brightness, canvas pause/resume, batch-boundary pause, intentional black pulses, and shutdown: PASS');
