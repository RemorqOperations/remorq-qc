async function loadManagerDashboard(){

const response = await apiJsonp("managerDashboard",{});

renderManagerDashboard(response);

}


function renderManagerDashboard(data){

document.getElementById("validatedMainCount").innerText = data.validated || 0;
document.getElementById("pendingCount").innerText = data.pending || 0;
document.getElementById("controlledCount").innerText = data.controlled || 0;
document.getElementById("returnedCount").innerText = data.returned || 0;
document.getElementById("mechanicsCount").innerText = data.mechanics_count || 0;

document.getElementById("hardCount").innerText = data.hard_validated || 0;
document.getElementById("easyCount").innerText = data.easy_validated || 0;

document.getElementById("hardPercent").innerText = data.hard_percent + "%";
document.getElementById("easyPercent").innerText = data.easy_percent + "%";

document.getElementById("dashboardDate").innerText = data.date_label;

const container = document.getElementById("mechanicsList");

const mechanics = data.mechanics || [];

container.innerHTML = mechanics.map(m => {

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

<div class="section-title">
VALIDÉ
</div>

<div class="mechanic-row">
<span>Vélos validés</span>
<strong>${m.validated}</strong>
</div>

<div class="mechanic-row">
<span>HARD</span>
<strong class="val-hard">${m.hard_validated}</strong>
</div>

<div class="mechanic-row">
<span>EASY / MEDIUM</span>
<strong class="val-easy">${m.easy_validated}</strong>
</div>

<div class="mechanic-row">
<span>% HARD</span>
<strong>${m.hard_percent}%</strong>
</div>

</div>


<div class="mechanic-section">

<div class="section-title">
À CONTRÔLER
</div>

<div class="mechanic-row">
<span>Total</span>
<strong class="pending">${m.pending}</strong>
</div>

<div class="mechanic-row">
<span>HARD</span>
<strong>${m.hard_pending}</strong>
</div>

<div class="mechanic-row">
<span>EASY / MEDIUM</span>
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
