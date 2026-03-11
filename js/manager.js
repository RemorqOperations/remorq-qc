let html5QrCode=null;
let scannerRunning=false;
let scanLocked=false;
let currentRepair=null;

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

torchEnabled=!torchEnabled;

try{

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

if(html5QrCode && scannerRunning){

await html5QrCode.stop();
scannerRunning=false;

}

document.getElementById("scannerModal").classList.add("hidden");

}

async function onScanSuccess(text){

if(scanLocked)return;

scanLocked=true;

const bike=text.split("/").pop().replace("=","");

const res=await api("findPendingRepair",{bike_id:bike});

if(!res.success){

scanLocked=false;
return;

}

currentRepair=res.repair;

closeScanner();

openDecisionModal();

}

function openDecisionModal(){

document.getElementById("decisionBikeId").innerText=currentRepair.bike_id;
document.getElementById("decisionMechanicName").innerText=currentRepair.mechanic_name;
document.getElementById("decisionRepairType").innerText=currentRepair.repair_type;

document.getElementById("decisionModal").classList.remove("hidden");

}

function closeDecisionModal(){

document.getElementById("decisionModal").classList.add("hidden");

}

async function validateQc(){

await qc("VALIDATED");

}

async function returnQc(){

await qc("RETURNED");

}

async function qc(decision){

const manager=localStorage.getItem("user_name");

await api("qcDecision",{

repair_id:currentRepair.repair_id,
decision:decision,
qc_by:manager

});

loadDashboard();
closeDecisionModal();

}

async function loadDashboard(){

const res=await api("managerDashboard",{

day_offset:dashboardDayOffset

});

document.getElementById("validatedMainCount").innerText=res.validated;
document.getElementById("pendingCount").innerText=res.pending;
document.getElementById("returnedCount").innerText=res.returned;

document.getElementById("hardCount").innerText=res.hard_validated;
document.getElementById("easyCount").innerText=res.easy_validated;

document.getElementById("hardPercent").innerText=res.hard_percent+"%";
document.getElementById("easyPercent").innerText=res.easy_percent+"%";

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
