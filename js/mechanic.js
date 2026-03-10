(function initMechanicPage() {
  const userName = localStorage.getItem("user_name");
  const userRole = localStorage.getItem("user_role");

  if (!userName || userRole !== "MECANO") {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("userName").innerText = userName;
  document.getElementById("userAvatar").innerText = userName.charAt(0).toUpperCase();

  renderDemoData();
})();

function renderDemoData() {
  document.getElementById("validatedCount").innerText = "0";
  document.getElementById("pendingCount").innerText = "0";
  document.getElementById("returnedCount").innerText = "0";

  const recentList = document.getElementById("recentList");
  recentList.innerHTML = `
    <div class="empty-state">Aucun scan pour le moment</div>
  `;
}

function refreshDashboard() {
  alert("Étape suivante : on branche les vraies données.");
}

function openScanner() {
  alert("Étape suivante : on ajoute le scanner QR.");
}

function logout() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_role");
  window.location.href = "login.html";
}
