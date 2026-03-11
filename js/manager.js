let html5QrCode = null;
let scannerRunning = false;
let scanLocked = false;
let currentRepair = null;
let dashboardDayOffset = 0;
let torchEnabled = false;

(function initManagerPage() {
  const userName = localStorage.getItem("user_name");
  const userRole = localStorage.getItem("user_role");

  if (!userName || userRole !== "RESPONSABLE") {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("userName").innerText = userName;
  document.getElementById("userAvatar").innerText = userName.charAt(0).toUpperCase();

  loadManagerDashboard();
})();

function previousDay() {
  dashboardDayOffset--;
  loadManagerDashboard();
}

function nextDay() {
  dashboardDayOffset++;
  loadManagerDashboard();
}

async function openScanner() {
  const modal = document.getElementById("scannerModal");
  const status = document.getElementById("scanStatus");

  modal.classList.remove("hidden");
  clearScannerSuccessUI();
  updateTorchButton();

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
    torchEnabled = false;
    updateTorchButton();

    status.className = "scan-status";
    status.innerText = "Caméra arrière active. Scanne le QR du vélo.";

    await tryImproveCameraFocus();
  } catch (error) {
    console.error(error);
    status.className = "scan-status error";
    status.innerText = "Impossible d’ouvrir la caméra";
  }
}

function pickBackCamera(cameras) {
  const normalized = cameras.map(c => ({
    ...c,
    labelLower: String(c.label || "").toLowerCase()
  }));

  return (
    normalized.find(c => c.labelLower.includes("back")) ||
    normalized.find(c => c.labelLower.includes("rear")) ||
    normalized.find(c => c.labelLower.includes("environment")) ||
    normalized.find(c => c.labelLower.includes("arrière")) ||
    normalized.find(c => c.labelLower.includes("arriere")) ||
    normalized[normalized.length - 1]
  );
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

async function toggleTorch() {
  if (!html5QrCode || !scannerRunning) return;

  try {
    torchEnabled = !torchEnabled;

    await html5QrCode.applyVideoConstraints({
      advanced: [{ torch: torchEnabled }]
    });

    updateTorchButton();
  } catch (e) {
    console.log("Lampe torche non supportée");
    torchEnabled = false;
    updateTorchButton();
  }
}

function updateTorchButton() {
  const btn = document.getElementById("torchButton");
  if (!btn) return;
  btn.innerText = torchEnabled ? "💡 Éteindre la lampe" : "💡 Allumer la lampe";
}

async function closeScanner() {
  const modal = document.getElementById("scannerModal");
  const status = document.getElementById("scanStatus");

  try {
    if (html5QrCode && scannerRunning) {
      if (torchEnabled) {
        try {
          await html5QrCode.applyVideoConstraints({
            advanced: [{ torch: false }]
          });
        } catch (e) {}
      }

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

  torchEnabled = false;
  updateTorchButton();
  scanLocked = false;
  clearScannerSuccessUI();
  modal.classList.add("hidden");
  status.className = "scan-status";
  status.innerText = "Caméra en attente...";
}

function onScanFailure(error) {}

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

  status.className = "scan-status";
  status.innerText = "Recherche du vélo " + bikeId + "...";

  try {
    const response = await apiJsonp("findPendingRepair", {
      bike_id: bikeId
    });

    if (!response.success) {
      status.className = "scan-status error";
      status.innerText = response.message || "Vélo non trouvé";
      scanLocked = false;
      return;
    }

    currentRepair = response.repair;

    playSuccessBeep();
    triggerScanFlash();
    flashScannerSuccess();

    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    status.className = "scan-status success";
    status.innerText = "Vélo " + bikeId + " trouvé";

    setTimeout(async () => {
      await closeScanner();
      openDecisionModal(currentRepair);
    }, 500);

  } catch (error) {
    console.error(error);
    status.className = "scan-status error";
    status.innerText = "Erreur de connexion au serveur";
    scanLocked = false;
  }
}

function openDecisionModal(repair) {
  document.getElementById("decisionBikeId").innerText = repair.bike_id || "-";
  document.getElementById("decisionMechanicName").innerText = repair.mechanic_name || "-";
  document.getElementById("decisionRepairType").innerText = repair.repair_type || "-";
  document.getElementById("decisionCreatedAt").innerText = repair.created_at || "-";
  document.getElementById("returnComment").value = "";
  document.getElementById("decisionStatus").className = "scan-status";
  document.getElementById("decisionStatus").innerText = "Choisis une décision.";
  document.getElementById("decisionModal").classList.remove("hidden");
}

function closeDecisionModal() {
  currentRepair = null;
  document.getElementById("decisionModal").classList.add("hidden");
  document.getElementById("decisionStatus").className = "scan-status";
  document.getElementById("decisionStatus").innerText = "Choisis une décision.";
}

async function validateQc() {
  await submitQcDecision("VALIDATED");
}

async function returnQc() {
  await submitQcDecision("RETURNED");
}

async function submitQcDecision(decision) {
  const statusBox = document.getElementById("decisionStatus");
  const managerName = localStorage.getItem("user_name") || "";
  const comment = document.getElementById("returnComment").value.trim();

  if (!currentRepair || !currentRepair.repair_id) {
    statusBox.className = "scan-status error";
    statusBox.innerText = "Aucune réparation sélectionnée";
    return;
  }

  statusBox.className = "scan-status";
  statusBox.innerText = "Enregistrement de la décision...";

  try {
    const response = await apiJsonp("qcDecision", {
      repair_id: currentRepair.repair_id,
      decision: decision,
      qc_by: managerName,
      qc_comment: comment
    });

    if (!response.success) {
      statusBox.className = "scan-status error";
      statusBox.innerText = response.message || "Erreur lors de la mise à jour";
      return;
    }

    playSuccessBeep();

    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    statusBox.className = "scan-status success";
    statusBox.innerText = decision === "VALIDATED" ? "Vélo validé" : "Vélo retourné";

    await loadManagerDashboard();

    setTimeout(() => {
      closeDecisionModal();
    }, 500);

  } catch (error) {
    console.error(error);
    statusBox.className = "scan-status error";
    statusBox.innerText = "Erreur de connexion au serveur";
  }
}

function extractBikeIdFromQr(qrText) {
  if (!qrText) return "";
  const value = String(qrText).trim();
  if (!value.includes("/")) return "";
  const lastPart = value.split("/").pop() || "";
  return lastPart.replace(/=+$/, "").trim();
}

function refreshDashboard() {
  loadManagerDashboard();
}

async function loadManagerDashboard() {
  try {
    const response = await apiJsonp("managerDashboard", {
      day_offset: dashboardDayOffset
    });

    if (!response.success) {
      renderManagerDashboard({
        controlled: 0,
        pending: 0,
        validated: 0,
        returned: 0,
        hard_validated: 0,
        easy_validated: 0,
        hard_percent: 0,
        easy_percent: 0,
        mechanics_count: 0,
        recent_qc: [],
        date_label: "-"
      });
      return;
    }

    renderManagerDashboard(response);
  } catch (error) {
    console.error(error);
    renderManagerDashboard({
      controlled: 0,
      pending: 0,
      validated: 0,
      returned: 0,
      hard_validated: 0,
      easy_validated: 0,
      hard_percent: 0,
      easy_percent: 0,
      mechanics_count: 0,
      recent_qc: [],
      date_label: "-"
    });
  }
}

function renderManagerDashboard(data) {
  document.getElementById("validatedMainCount").innerText = String(data.validated || 0);
  document.getElementById("pendingCount").innerText = String(data.pending || 0);
  document.getElementById("controlledCount").innerText = String(data.controlled || 0);
  document.getElementById("returnedCount").innerText = String(data.returned || 0);
  document.getElementById("mechanicsCount").innerText = String(data.mechanics_count || 0);
  document.getElementById("hardCount").innerText = String(data.hard_validated || 0);
  document.getElementById("easyCount").innerText = String(data.easy_validated || 0);
  document.getElementById("hardPercent").innerText = String(data.hard_percent || 0) + "%";
  document.getElementById("easyPercent").innerText = String(data.easy_percent || 0) + "%";
  document.getElementById("dashboardDate").innerText = data.date_label || "-";

  const recentQcList = document.getElementById("recentQcList");
  const recent = Array.isArray(data.recent_qc) ? data.recent_qc : [];

  if (recent.length === 0) {
    recentQcList.innerHTML = `<div class="empty-state">Aucun contrôle pour le moment</div>`;
    return;
  }

  recentQcList.innerHTML = recent.map(item => `
    <div class="history-item">
      <div class="history-top">
        <div class="bike-id">${escapeHtml(item.bike_id || "")}</div>
        <div class="badge ${getBadgeClass(item.status)}">${getStatusLabel(item.status)}</div>
      </div>
      <div class="history-meta">
        ${escapeHtml(item.mechanic_name || "")}
        ${item.qc_at ? "· " + escapeHtml(item.qc_at) : ""}
        ${item.repair_type ? "· " + escapeHtml(item.repair_type) : ""}
      </div>
    </div>
  `).join("");
}

function getBadgeClass(status) {
  if (status === "VALIDATED") return "validated";
  if (status === "RETURNED") return "returned";
  return "pending";
}

function getStatusLabel(status) {
  if (status === "VALIDATED") return "Validé";
  if (status === "RETURNED") return "Retourné";
  return "À contrôler";
}

function apiJsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = "remorqCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    window[callbackName] = function (data) {
      cleanup();
      resolve(data);
    };

    const query = new URLSearchParams({
      action,
      callback: callbackName,
      ...params
    });

    const script = document.createElement("script");
    script.src = API_URL + "?" + query.toString();

    script.onerror = function () {
      cleanup();
      reject(new Error("Erreur JSONP"));
    };

    document.body.appendChild(script);

    function cleanup() {
      try {
        delete window[callbackName];
      } catch (e) {}
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
  });
}

function triggerScanFlash() {
  const modal = document.getElementById("scannerModal");
  if (!modal) return;

  modal.classList.remove("scan-flash");
  void modal.offsetWidth;
  modal.classList.add("scan-flash");

  setTimeout(() => {
    modal.classList.remove("scan-flash");
  }, 260);
}

function flashScannerSuccess() {
  const modal = document.getElementById("scannerModal");
  const sheet = modal.querySelector(".scanner-sheet");
  const readerBox = document.getElementById("qr-reader");

  modal.classList.add("scan-success");
  if (sheet) sheet.classList.add("scan-success");
  if (readerBox) readerBox.classList.add("scan-success");
}

function clearScannerSuccessUI() {
  const modal = document.getElementById("scannerModal");
  if (!modal) return;

  const sheet = modal.querySelector(".scanner-sheet");
  const readerBox = document.getElementById("qr-reader");

  modal.classList.remove("scan-success");
  modal.classList.remove("scan-flash");
  if (sheet) sheet.classList.remove("scan-success");
  if (readerBox) readerBox.classList.remove("scan-success");
}

function playSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1046, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.14);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.14);
  } catch (e) {
    console.log("Bip non disponible");
  }
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
