let html5QrCode = null;
let scannerRunning = false;

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
  alert("Étape suivante : on branchera les vraies données.");
}

async function openScanner() {
  const modal = document.getElementById("scannerModal");
  const status = document.getElementById("scanStatus");

  modal.classList.remove("hidden");
  status.className = "scan-status";
  status.innerText = "Initialisation de la caméra...";

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qr-reader");
    }

    if (scannerRunning) {
      return;
    }

    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      status.className = "scan-status error";
      status.innerText = "Aucune caméra trouvée";
      return;
    }

    const backCamera = cameras[cameras.length - 1].id;

    await html5QrCode.start(
      backCamera,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      onScanSuccess,
      onScanFailure
    );

    scannerRunning = true;
    status.className = "scan-status";
    status.innerText = "Caméra active. Scanne le QR du vélo.";
  } catch (error) {
    status.className = "scan-status error";
    status.innerText = "Impossible d’ouvrir la caméra";
    console.error(error);
  }
}

async function closeScanner() {
  const modal = document.getElementById("scannerModal");
  const status = document.getElementById("scanStatus");

  try {
    if (html5QrCode && scannerRunning) {
      await html5QrCode.stop();
      await html5QrCode.clear();
      scannerRunning = false;
      html5QrCode = null;
    }
  } catch (error) {
    console.error(error);
  }

  modal.classList.add("hidden");
  status.className = "scan-status";
  status.innerText = "Caméra en attente...";
}

function onScanFailure(error) {
}

async function onScanSuccess(decodedText) {
  const status = document.getElementById("scanStatus");

  const bikeId = extractBikeIdFromQr(decodedText);

  if (!bikeId) {
    status.className = "scan-status error";
    status.innerText = "QR non reconnu";
    return;
  }

  status.className = "scan-status success";
  status.innerText = "Vélo " + bikeId + " détecté";

  addRecentScan({
    bike_id: bikeId,
    scanned_at: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    status: "PENDING_QC"
  });

  setTimeout(async () => {
    await closeScanner();
    alert("Vélo " + bikeId + " prêt pour contrôle");
  }, 700);
}

function extractBikeIdFromQr(qrText) {
  if (!qrText) return "";

  const value = String(qrText).trim();

  if (!value.includes("/")) return "";

  const lastPart = value.split("/").pop() || "";

  return lastPart.replace(/=+$/, "").trim();
}

function addRecentScan(scan) {
  const recentList = document.getElementById("recentList");

  const empty = recentList.querySelector(".empty-state");
  if (empty) {
    empty.remove();
  }

  const item = document.createElement("div");
  item.className = "history-item";

  item.innerHTML = `
    <div class="history-top">
      <div class="bike-id">${scan.bike_id}</div>
      <div class="badge pending">À contrôler</div>
    </div>
    <div class="history-meta">Scanné à ${scan.scanned_at}</div>
  `;

  recentList.prepend(item);

  while (recentList.children.length > 5) {
    recentList.removeChild(recentList.lastChild);
  }

  const pending = parseInt(document.getElementById("pendingCount").innerText || "0", 10);
  document.getElementById("pendingCount").innerText = String(pending + 1);
}

function logout() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_role");
  window.location.href = "login.html";
}
