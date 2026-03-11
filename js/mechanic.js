let html5QrCode=null;
let scannerRunning=false;
let scanLocked=false;
let pendingScan=null;

let dashboardDayOffset=0;

let torchEnabled=false;

function previousDay(){

dashboardDayOffset--;
loadDashboard();

}

function nextDay(){

dashboardDayOffset++;
loadDashboard();

}

async function toggleTorch(){

if(!html5QrCode)return;

try{

torchEnabled=!torchEnabled;

await html5QrCode.applyVideoConstraints({
advanced:[{torch:torchEnabled}]
});

}catch(e){

console.log("flash non supporté");

}

}

async function openScanner(){

const modal=document.getElementById("scannerModal");

modal.classList.remove("hidden");

if(!html5QrCode){

html5QrCode=new Html5Qrcode("qr-reader");

}

const cameras=await Html5Qrcode.getCameras();

await html5QrCode.start(

cameras[0].id,

{fps:20,qrbox:250},

onScanSuccess

);

scannerRunning=true;

}

async function closeScanner(){

const modal=document.getElementById("scannerModal");

if(html5QrCode && scannerRunning){

await html5QrCode.stop();

scannerRunning=false;

}

modal.classList.add("hidden");

}

function onScanSuccess(text){

if(scanLocked)return;

scanLocked=true;

const bike=text.split("/").pop().replace("=","");

pendingScan={
bike_id:bike,
qr_raw:text
};

closeScanner();

document.getElementById("repairTypeBikeId").innerText=bike;

document.getElementById("repairTypeModal").classList.remove("hidden");

}

function closeRepairTypeModal(){

document.getElementById("repairTypeModal").classList.add("hidden");

scanLocked=false;

}

async function submitRepairType(type){

const mechanicId=localStorage.getItem("user_id");
const mechanicName=localStorage.getItem("user_name");

const res=await api("saveRepairScan",{

mechanic_id:mechanicId,
mechanic_name:mechanicName,
bike_id:pendingScan.bike_id,
qr_raw:pendingScan.qr_raw,
repair_type:type

});

if(res.success){

loadDashboard();

closeRepairTypeModal();

}

}

async function loadDashboard(){

const mechanicId=localStorage.getItem("user_id");

const res=await api("mechanicDashboard",{

mechanic_id:mechanicId,
day_offset:dashboardDayOffset

});

document.getElementById("validatedCount").innerText=res.validated;
document.getElementById("pendingCount").innerText=res.pending;
document.getElementById("returnedCount").innerText=res.returned;
document.getElementById("dashboardDate").innerText=res.date_label;

}

function api(action,data){

return new Promise((resolve)=>{

const cb="cb"+Date.now();

window[cb]=(r)=>resolve(r);

const q=new URLSearchParams({
action,
callback:cb,
...data
});

const s=document.createElement("script");

s.src=API_URL+"?"+q;

document.body.appendChild(s);

});

}

function logout(){

localStorage.clear();
location.href="login.html";

}

loadDashboard();
