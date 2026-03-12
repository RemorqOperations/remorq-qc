const API_URL = "https://script.google.com/macros/s/AKfycbwhdxBwi9q7v6ONOlRGmJT8Shg49FiZvr52zjV-uPVKsOpNw43EX-VW72A1YtXlGAOtyg/exec";

/* ===============================
   INIT
================================*/

let dashboardDayOffset = 0;

init();

function init(){

const userName = localStorage.getItem("user_name");
const role = localStorage.getItem("user_role");

if(!userName || role !== "RESPONSABLE"){

window.location.href="login.html";
return;

}

document.getElementById("userName").innerText=userName;
document.getElementById("userAvatar").innerText=userName[0];

loadManagerDashboard();

}

/* ===============================
   DASHBOARD
================================*/

async function loadManagerDashboard(){

try{

const data = await apiJsonp("managerDashboard",{
day_offset:dashboardDayOffset
});

renderManagerDashboard(data);

}catch(e){

console.error(e);

}

}

/* ===============================
   RENDER
================================*/

function renderManagerDashboard(data){

document.getElementById("validatedMainCount").innerText = data.validated || 0;
document.getElementById("pendingCount").innerText = data.pending || 0;
document.getElementById("controlledCount").innerText = data.controlled || 0;
document.getElementById("returnedCount").innerText = data.returned || 0;

document.getElementById("mechanicsCount").innerText = data.mechanics_count || 0;

document.getElementById("hardCount").innerText = data.hard_validated || 0;
document.getElementById("easyCount").innerText = data.easy_validated || 0;

document.getElementById("hardPercent").innerText = (data.hard_percent||0)+"%";
document.getElementById("easyPercent").innerText = (data.easy_percent||0)+"%";

document.getElementById("dashboardDate").innerText = data.date_label || "-";

const container = document.getElementById("mechanicsList");

const mechanics = data.mechanics || [];

if(mechanics.length===0){

container.innerHTML="<div>Aucune donnée</div>";
return;

}

container.innerHTML = mechanics.map(m=>{

let avgClass="avg-red";

if(m.avg_color==="green") avgClass="avg-green";
if(m.avg_color==="orange") avgClass="avg-orange";

return `

<div class="mechanic-card">

<div class="mechanic-header">

<div class="mechanic-name">${m.name}</div>

<div class="avg-badge ${avgClass}">
${m.avg_per_hour}/h
</div>

</div>

<div class="mechanic-section">

<div class="section-title">VALIDÉ</div>

<div class="mechanic-row">
<span>Vélos validés</span>
<strong>${m.validated}</strong>
</div>

<div class="mechanic-row">
<span>HARD</span>
<strong class="val-hard">${m.hard_validated}</strong>
</div>

<div class="mechanic-row">
<span>EASY/MEDIUM</span>
<strong class="val-easy">${m.easy_validated}</strong>
</div>

<div class="mechanic-row">
<span>% HARD</span>
<strong>${m.hard_percent}%</strong>
</div>

</div>

<div class="mechanic-section">

<div class="section-title">À CONTROLER</div>

<div class="mechanic-row">
<span>Total</span>
<strong class="pending">${m.pending}</strong>
</div>

<div class="mechanic-row">
<span>HARD</span>
<strong>${m.hard_pending}</strong>
</div>

<div class="mechanic-row">
<span>EASY/MEDIUM</span>
<strong>${m.easy_pending}</strong>
</div>

</div>

<div class="mechanic-section">

<div class="mechanic-row">
<span>Retournés</span>
<strong class="returned">${m.returned}</strong>
</div>

</div>

</div>

`;

}).join("");

}

/* ===============================
   NAVIGATION JOUR
================================*/

function previousDay(){

dashboardDayOffset--;
loadManagerDashboard();

}

function nextDay(){

dashboardDayOffset++;
loadManagerDashboard();

}

function refreshDashboard(){

loadManagerDashboard();

}

/* ===============================
   API JSONP
================================*/

function apiJsonp(action,params={}){

return new Promise((resolve,reject)=>{

const callbackName="cb_"+Date.now();

window[callbackName]=(data)=>{

delete window[callbackName];
resolve(data);

};

const query = new URLSearchParams({
action,
callback:callbackName,
...params
});

const script=document.createElement("script");

script.src = API_URL+"?"+query.toString();

script.onerror=()=>reject("API error");

document.body.appendChild(script);

});

}

/* ===============================
   LOGOUT
================================*/

function logout(){

localStorage.removeItem("user_name");
localStorage.removeItem("user_role");
localStorage.removeItem("user_id");

window.location.href="login.html";

}
