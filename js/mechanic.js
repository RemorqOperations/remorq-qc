let html5QrCode = null;
let scannerRunning = false;
let scanLocked = false;

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
  status.innerText = "Ouverture caméra...";

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qr-reader");
    }

    if (scannerRunning) {
      status.innerText = "Caméra déjà active";
      return;
    }

    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      status.className = "scan-status error";
      status.innerText = "Aucune caméra trouvée";
      return;
    }

    const selectedCamera = pickBackCamera(cameras);

    await html5QrCode.start(
      selectedCamera.id,
      {
        fps: 20,
        qrbox: calcQrBox(),
        aspectRatio: 1,
        disableFlip: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      },
      onScanSuccess,
      onScanFailure
    );

    scannerRunning = true;
    scanLocked = false;

    status.className = "scan-status";
    status.innerText = "Caméra active. Scanne le QR du vélo.";

    await tryImproveCameraFocus();

  } catch (error) {
    status.className = "scan-status error";
    status.innerText = "Impossible d’ouvrir la caméra";
    console.error(error);
  }
}

function pickBackCamera(cameras) {
  const normalized = cameras.map(c => ({
    ...c,
    labelLower: String(c.label || "").toLowerCase()
  }));

  const preferred =
    normalized.find(c => c.labelLower.includes("back")) ||
    normalized.find(c => c.labelLower.includes("rear")) ||
    normalized.find(c => c.labelLower.includes("environment")) ||
    normalized.find(c => c.labelLower.includes("arrière")) ||
    normalized.find(c => c.labelLower.includes("arriere")) ||
    normalized[normalized.length - 1];

  return preferred;
}

function calcQrBox() {
  const width = Math.min(window.innerWidth || 320, 520);
  const size = Math.max(220, Math.floor(width * 0.72));

  return { width: size, height: size };
}

async function tryImproveCameraFocus() {
  if (!html5QrCode) return;

  try {
    await html5QrCode.applyVideoConstraints({
      advanced: [{ focusMode: "continuous" }]
    });
  } catch (e1) {
    try {
      await html5QrCode.applyVideoConstraints({
        focusMode: "continuous"
      });
    } catch (e2) {
      console.log("Focus continu non supporté");
    }
  }
}

async function closeScanner() {
  const modal = document.getElementById("scannerModal");
  const status = document.getElementById("scanStatus");

  try {
    if (html5QrCode && scannerRunning) {
      await html5QrCode.stop();
      scannerRunning = false;
    }

    if (html5QrCode) {
      await html5QrCode.clear();
      html5QrCode = null;
    }
  } catch (error) {
    console.error(error);
  }

  scanLocked = false;
  modal.classList.add("hidden");
  status.className = "scan-status";
  status.innerText = "Caméra en attente...";
}

function onScanFailure(error) {
}

async function onScanSuccess(decodedText) {
  if (scanLocked) return;
  scanLocked = true;

  const status = document.getElementById("scanStatus");
  const bikeId = extractBikeIdFromQr(decodedText);

  if (!bikeId) {
    status.className = "scan-status error";
    status.innerText = "QR non reconnu";
    scanLocked = false;
    return;
  }

  if (navigator.vibrate) {
    navigator.vibrate(120);
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
  }, 350);
}

function extractBikeIdFromQr(qrText) {
  if (!qrText) return "";

  const value = String(qrText).trim();

  if (!value.includes("/")) return "";

  const lastPart = value.split("/").pop() || "";
  const cleaned = lastPart.replace(/=+$/, "").trim();

  if (!cleaned) return "";

  return cleaned;
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
      <div class="bike-id">${escapeHtml(scan.bike_id)}</div>
      <div class="badge pending">À contrôler</div>
    </div>
    <div class="history-meta">Scanné à ${escapeHtml(scan.scanned_at)}</div>
  `;

  recentList.prepend(item);

  while (recentList.children.length > 5) {
    recentList.removeChild(recentList.lastChild);
  }

  const pending = parseInt(document.getElementById("pendingCount").innerText || "0", 10);
  document.getElementById("pendingCount").innerText = String(pending + 1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logout() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_role");
  window.location.href = "login.html";
}
