// SPDX-License-Identifier: MIT
// RGB packet encoding and TinyUZ port: andyjusa/hydroshift2-rs (MIT).
// A034 LCD/telemetry protocol reference: sgtaziz/lian-li-linux (MIT).
// TinyUZ format: housisong/sisong TinyUZ (MIT). See NOTICE.md and bundled notices.
import LCD from "@SignalRGB/lcd";
export function Name(){return "Lian Li HydroShift II S (Experimental)";}
export function VendorId(){return 0x1cbe;}
export function ProductId(){return 0xa034;}
export function Type(){return "rawusb";}
export function Publisher(){return "Local H2S experiment";}
export function Size(){return [11,11];}
export function DefaultPosition(){return [140,80];}
export function DefaultScale(){return 3;}
export function DeviceType(){return "aio";}
export function DeviceMessage(){return ["实验版：外圈与屏幕。灯效约延迟 1–2 秒。","通过 SignalRGB 原生 USB 插件通信，无需桥接程序。"]}
const points=Array.from({length:24},(_,i)=>[Math.round(5+5*Math.sin(i*Math.PI/12)),Math.round(5-5*Math.cos(i*Math.PI/12))]);
export function LedNames(){return points.map((_,i)=>"Ring "+(i+1));}
export function LedPositions(){return points;}
export function ControllableParameters(){return [
 {property:"LightingMode",group:"lighting",label:"灯光来源",type:"combobox",values:["Canvas","Forced"],default:"Canvas"},
 {property:"forcedColor",group:"lighting",label:"固定颜色",type:"color",default:"#ff8000"},
 {property:"ringLevel",group:"lighting",label:"冷头外圈亮度 (%)",type:"number",min:0,max:100,default:40},
 {property:"updateMs",group:"lighting",label:"灯效采样长度 (ms)",type:"number",min:500,max:3000,default:1000},
 {property:"enableLCD",group:"",label:"启用屏幕控制（实验）",type:"boolean",default:false},
 {property:"screenLevel",group:"",label:"屏幕硬件亮度 (%)",type:"number",min:0,max:100,default:50},
 {property:"screenFPS",group:"",label:"屏幕上传帧率",type:"number",min:1,max:15,default:5},
 {property:"screenContent",group:"",label:"屏幕来源",type:"combobox",values:["SignalRGB LCD","Coolant + Pump"],default:"SignalRGB LCD"},
 {property:"infoLayout",group:"",label:"信息布局",type:"combobox",values:["双行","大号水温","大号转速"],default:"双行"},
 {property:"infoBackground",group:"",label:"信息背景颜色",type:"color",default:"#000000"},
 {property:"infoText",group:"",label:"信息数字颜色",type:"color",default:"#ebf5ff"},
 {property:"infoAccent",group:"",label:"信息标题颜色",type:"color",default:"#20b4ff"}
];}
const key=CryptoJS.enc.Utf8.parse("slv3tuzx");
let seq=0,ready=false,frames=[],lastCapture=0,lastUpload=0,lastKey="",uploads=0,lastFrame=null;
let lastRingControls="",ringControlPending=false,ringControlChangedAt=0;
let canvasBlankSince=null,canvasBlankHeld=false;
const blackRing=new Array(72).fill(0);
function ringIsOff(){return Number(ringLevel)<=0 || Number(device.getBrightness())<=0;}
function ringControls(){return [device.getBrightness(),ringLevel,LightingMode,forcedColor].join("|");}
function refreshRingControls(){
 const controls=ringControls();if(controls===lastRingControls)return;
 frames=[];
 canvasBlankSince=null;canvasBlankHeld=false;
 lastRingControls=controls;ringControlPending=true;ringControlChangedAt=Date.now();
}
export function onBrightnessChanged(){refreshRingControls();}
export function onringLevelChanged(){refreshRingControls();}
export function onLightingModeChanged(){refreshRingControls();}
export function onforcedColorChanged(){refreshRingControls();}
let screenReady=false,lastLCD=0,lcdFrames=0,lcdErrors=0,lastScreenLevel=-1,lastTelemetry=0;
let coolant=null,pumpRPM=null,panelCache=null,panelKey="",lastPanelSent=null;
const panelEncoder=new JPEGEncoder(75);
const glyphs={
 "0":["01110","10001","10011","10101","11001","10001","01110"],"1":["00100","01100","00100","00100","00100","00100","01110"],
 "2":["01110","10001","00001","00010","00100","01000","11111"],"3":["11110","00001","00001","01110","00001","00001","11110"],
 "4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","10000","11110","00001","00001","11110"],
 "6":["01110","10000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],
 "8":["01110","10001","10001","01110","10001","10001","01110"],"9":["01110","10001","10001","01111","00001","00001","01110"],
 "C":["01111","10000","10000","10000","10000","10000","01111"],"O":["01110","10001","10001","10001","10001","10001","01110"],
 "L":["10000","10000","10000","10000","10000","10000","11111"],"A":["01110","10001","10001","11111","10001","10001","10001"],
 "N":["10001","11001","10101","10011","10001","10001","10001"],"T":["11111","00100","00100","00100","00100","00100","00100"],
 "P":["11110","10001","10001","11110","10000","10000","10000"],"U":["10001","10001","10001","10001","10001","10001","01110"],
 "M":["10001","11011","10101","10101","10001","10001","10001"],"R":["11110","10001","10001","11110","10100","10010","10001"],
 "-":["00000","00000","00000","11111","00000","00000","00000"]
};
function infoFrame(){
 const k=[coolant,pumpRPM,infoLayout,infoBackground,infoText,infoAccent].join(":");if(panelCache && panelKey===k)return panelCache;
 function rgb(s){return [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];}
 const bg=rgb(infoBackground),fg=rgb(infoText),accent=rgb(infoAccent);
 const pixels=new Uint8Array(480*480*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=bg[0];pixels[i+1]=bg[1];pixels[i+2]=bg[2];pixels[i+3]=255;}
 function text(s,y,scale,color){const x0=Math.round((480-(s.length*6-1)*scale)/2);let x=x0;
  for(const c of s){const g=glyphs[c];if(g)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(g[row][col]==="1")
   for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const pos=((y+row*scale+dy)*480+x+col*scale+dx)*4;if(pos>=0 && pos+3<pixels.length){pixels[pos]=color[0];pixels[pos+1]=color[1];pixels[pos+2]=color[2];}}
   x+=6*scale;
  }
 }
 if(infoLayout==="大号水温"){
  const value=(coolant===null?"--":String(coolant))+" C";
  text("COOLANT",78,7,accent);text(value,210,Math.min(19,Math.floor(440/(value.length*6-1))),fg);
 }else if(infoLayout==="大号转速"){
  text("PUMP",65,8,accent);text(pumpRPM===null?"----":String(pumpRPM),204,19,fg);text("RPM",389,6,accent);
 }else{
  text("COOLANT",36,6,accent);text((coolant===null?"--":String(coolant))+" C",101,13,fg);
  text("PUMP",253,6,accent);text(pumpRPM===null?"----":String(pumpRPM),319,12,fg);text("RPM",420,5,accent);
 }
 panelCache=Array.from(panelEncoder.encode({data:pixels,width:480,height:480},75));panelKey=k;return panelCache;
}
function words(bytes){let w=[];bytes.forEach((b,i)=>{w[i>>>2]=(w[i>>>2]||0)|((b&255)<<(24-(i%4)*8));});return CryptoJS.lib.WordArray.create(w,bytes.length);}
function packet(cmd,params=[]){
 const p=new Array(500).fill(0);p[0]=cmd;p[2]=26;p[3]=109;seq++;
 for(let i=0;i<4;i++)p[4+i]=(seq>>>(i*8))&255;
 params.forEach((v,i)=>p[8+i]=v);
 const enc=CryptoJS.DES.encrypt(words(p),key,{iv:key,mode:CryptoJS.mode.CBC,padding:CryptoJS.pad.Pkcs7}).ciphertext;
 const out=[];for(let i=0;i<enc.sigBytes;i++)out.push((enc.words[i>>>2]>>>(24-(i%4)*8))&255);
 return out.concat([0,0,0,0,0,0,161,26]);
}
function readReply(cmd,limit=24){
 for(let i=0;i<limit;i++){
  const r=device.bulk_transfer(129,new Array(512).fill(0),512,100);
  if(r.length>0 && r.data && r.data[0]===cmd)return r.data;
  device.pause(1);
 }
 return null;
}
function query(cmd,limit=24,params=[]){
 const p=packet(cmd,params),w=device.bulk_transfer(1,p,p.length,2000);
 if(w.length!==p.length)return null;
 return readReply(cmd,limit);
}
function telemetry(){
 const first=lastTelemetry===0;lastTelemetry=Date.now();
 const r=query(250,24);if(!r || r.length<22){coolant=null;pumpRPM=null;return;}
 const temp=r[13],rpm=(r[20]<<8)|r[21];
 coolant=temp>=0 && temp<=100?temp:null;pumpRPM=rpm>0 && rpm<10000?rpm:null;
 if(temp>=0 && temp<=100)device.SetTemperature("H2S Coolant",temp);
 if(first)device.log("H2S_TELEMETRY coolant="+temp+" pump="+rpm);
 lastTelemetry=Date.now();
}
function sendLCD(){
 if(!screenReady){query(123,16);query(52,16);screenReady=true;}
 if(lastScreenLevel!==Number(screenLevel)){
  if(query(14,24,[Math.max(0,Math.min(100,Number(screenLevel)))])){lastScreenLevel=Number(screenLevel);device.log("H2S_SCREEN_BRIGHTNESS_OK "+lastScreenLevel);}
 }
 const jpg=screenContent==="Coolant + Pump"?infoFrame():LCD.getFrame({format:"JPEG",quality:75});
 if(screenContent!=="SignalRGB LCD" && jpg===lastPanelSent)return;
 if(!jpg || jpg.length<4 || jpg[0]!==255 || jpg[1]!==216 || jpg.length>153600){
  if(lcdFrames===0)device.log("H2S_LCD_WAIT_FRAME length="+(jpg?jpg.length:0));return;
 }
 const n=jpg.length,p=packet(101,[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]).concat(jpg);
 const w=device.bulk_transfer(1,p,p.length,2000);
 if(w.length!==p.length){ready=false;device.log("H2S_LCD_SHORT_WRITE: USB paused");return;}
 const ack=readReply(101,32);
 if(!ack){lcdErrors++;if(lcdErrors>=3){screenReady=false;device.log("H2S_LCD_NO_ACK: paused");}return;}
 lcdErrors=0;lcdFrames++;
 if(screenContent!=="SignalRGB LCD")lastPanelSent=jpg;
 if(lcdFrames<=3 || lcdFrames%100===0)device.log("H2S_LCD_UPLOAD_OK bytes="+p.length+" count="+lcdFrames);
}
export function onenableLCDChanged(){screenReady=false;lcdErrors=0;lastLCD=0;lastScreenLevel=-1;lastPanelSent=null;}
export function onscreenContentChanged(){lastPanelSent=null;}
// JavaScript port of TinyWriter/longest_match from andyjusa/hydroshift2-rs
// src/compression.rs at 5b5c95d68d264fca0ddd642f61b5fc4d43481c3a (MIT).
// Uses the housisong TinyUZ format and individual literals instead of literal lines.
function tinyuz(data){
 const code=[];let count=0,index=0,have=false,lastDistance=1,maxDistance=1;
 function bit(v){if(count===0){index=code.length;code.push(0);}code[index]|=(v&1)<<count;count=(count+1)%8;}
 function len(v,b){let n=1;while(v>=Math.pow(2,n*b)){v-=Math.pow(2,n*b);n++;}while(n>0){n--;for(let j=0;j<b;j++)bit((v>>>(n*b+j))&1);bit(n>0?1:0);}}
 let position=0;
 while(position<data.length){
  let bestLength=0,bestDistance=0;
  for(let distance=1;distance<=Math.min(position,127);distance++){
   let length=0;while(position+length<data.length && data[position+length]===data[position+length-distance])length++;
   if(length>bestLength){bestLength=length;bestDistance=distance;}
  }
  if(bestLength>=3){
   bit(0);len(bestLength-2,1);
   const reuse=have && lastDistance===bestDistance;if(have)bit(reuse?1:0);
   if(!reuse)code.push(bestDistance);
   have=false;lastDistance=bestDistance;maxDistance=Math.max(maxDistance,bestDistance);position+=bestLength;
  }else{bit(1);code.push(data[position++]);have=true;}
 }
 bit(0);len(3,1);if(have)bit(0);code.push(0);
 return [maxDistance&255,(maxDistance>>>8)&255,0,0].concat(code);
}
function sample(){
 if(ringIsOff())return blackRing.slice();
 const out=[];
 const scale=Math.max(0,Math.min(100,Number(ringLevel)))/100;
 for(const pos of points){
  let c=LightingMode==="Forced"?[parseInt(forcedColor.slice(1,3),16),parseInt(forcedColor.slice(3,5),16),parseInt(forcedColor.slice(5,7),16)]:device.color(pos[0],pos[1]);
  // Canvas colors already include SignalRGB's device/global brightness.
  if(LightingMode==="Forced")c=c.map(v=>Math.round(v*device.getBrightness()/100));
  out.push(...c.map(v=>Math.max(0,Math.min(255,Math.round(v*scale)))));
 }
 return out;
}
function upload(fs){
 const raw=[].concat(...fs),encoded=tinyuz(raw),payload=encoded.concat([(fs.length>>>8)&255,fs.length&255,50,24]);
 // The LCD uses acknowledged JPEG frames, not H.264 playback. Wake once in
 // Initialize; repeated StopPlay/StopClock commands are unnecessary here.
 device.log("H2S_RGB_DIRECT_BEGIN frames="+fs.length+" nonzero="+raw.filter(v=>v!==0).length);
 const size=payload.length,p=packet(252,[0,0,0,0,(size>>>24)&255,(size>>>16)&255,(size>>>8)&255,size&255]).concat(payload);
 const w=device.bulk_transfer(1,p,p.length,1000);
 if(w.length!==p.length){ready=false;device.log("H2S_SHORT_RGB_WRITE: paused");return;}
 device.pause(500);
 const response=query(10,32);
 if(!response){ready=false;device.log("H2S_NO_FIRMWARE_AFTER_UPLOAD: paused; re-enable device to retry");return;}
 uploads++;if(uploads<=5 || uploads%20===0)device.log("H2S_NATIVE_UPLOAD_OK frames="+fs.length+" bytes="+p.length+" count="+uploads);
 lastPanelSent=null;
}
export function Initialize(){
 LCD.initialize({width:480,height:480});
 device.log("H2S_LCD_API "+Object.keys(LCD));
 device.log("H2S_BUILD canvas-pause-3");
 query(123,4);query(52,4);
 const r=query(10,32);ready=!!r;
 device.log(ready?"H2S_NATIVE_READY "+String.fromCharCode(...r.slice(8,27)):"H2S_NATIVE_NOT_READY");
 frames=[];lastCapture=0;lastUpload=Date.now();lastKey="";
 canvasBlankSince=null;canvasBlankHeld=false;
 lastRingControls=ringControls();ringControlPending=false;
 device.createTemperatureSensor("H2S Coolant");lastTelemetry=0;telemetry();
}
export function Render(){
 if(!ready)return;
 const now=Date.now();
 if(ringControls()!==lastRingControls)refreshRingControls();
 if(ringControlPending){
  // Zero bypasses batching. Nonzero slider moves are briefly coalesced.
  // Never upload the old and new brightness values as a looping animation.
  if(ringIsOff() || now-ringControlChangedAt>=120){
   const frame=sample(),k=JSON.stringify([frame]);lastFrame=frame;
   if(k!==lastKey){upload([frame]);if(ready){lastKey=k;device.log("H2S_RING_CONTROL_UPDATE off="+ringIsOff()+" frames=1");}}
   frames=[];ringControlPending=false;lastUpload=Date.now();lastCapture=now;
   return;
  }
  if(now-lastTelemetry>3000)telemetry();
  if(enableLCD && lcdErrors<3 && now-lastLCD>=1000/Number(screenFPS)){sendLCD();lastLCD=Date.now();}
  return;
 }
 if(now-lastTelemetry>3000)telemetry();
 if(enableLCD && lcdErrors<3 && now-lastLCD>=1000/Number(screenFPS)){sendLCD();lastLCD=Date.now();}
 if(!ready || now-lastCapture<45)return;lastCapture=now;
 const frame=sample();lastFrame=frame;
 // Canvas pause does not change device brightness. Do not loop a batch
 // containing the old animation followed by the paused, black canvas.
 // Brief black pulses remain in animation batches; sustained black settles.
 if(LightingMode==="Canvas" && frame.every(v=>v===0)){
  if(canvasBlankSince===null)canvasBlankSince=now;
  if(canvasBlankHeld || now-canvasBlankSince>=150){
   frames=[];const k=JSON.stringify([frame]);
   if(k!==lastKey){upload([frame]);if(ready){lastKey=k;device.log("H2S_CANVAS_BLACK_SETTLED frames=1");}}
   canvasBlankHeld=true;lastUpload=Date.now();return;
  }
  frames.push(frame);if(frames.length>60)frames.shift();
  return; // Wait for black to settle before committing a mixed loop.
 }
 canvasBlankSince=null;
 if(canvasBlankHeld){
  frames=[];canvasBlankHeld=false;const k=JSON.stringify([frame]);
  if(k!==lastKey){upload([frame]);if(ready){lastKey=k;device.log("H2S_CANVAS_RESUMED frames=1");}}
  lastUpload=Date.now();return;
 }
 frames.push(frame);if(frames.length>60)frames.shift();
 if(now-lastUpload<Number(updateMs))return;
 const isStatic=frames.every(f=>f.every((v,i)=>v===frames[0][i]));
 const fs=isStatic?[frames[frames.length-1]]:frames;
 const k=JSON.stringify(fs);
 if(k!==lastKey){upload(fs);if(ready)lastKey=k;}
 frames=[];lastUpload=Date.now();
}
// Replace the onboard loop with its last color when SignalRGB exits/disables.
export function Shutdown(SystemSuspending){
 if(ready){const frame=SystemSuspending || device.enabled===false || ringIsOff()?blackRing.slice():sample();upload([frame]);}
 ready=false;
}
