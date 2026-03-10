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

  loadMechanicDashboard();
})();

async function openScanner() {
  const modal = document.getElementById("scannerModal");
  const status = document.getElementById("scanStatus");

  modal.classList.remove("hidden");
  clearScannerSuccessUI();

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
  clearScannerSuccessUI();
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

  status.className = "scan-status";
  status.innerText = "Enregistrement du vélo " + bikeId + "...";

  const mechanicId = localStorage.getItem("user_id") || "";
  const mechanicName = localStorage.getItem("user_name") || "";

  try {
    const response = await apiJsonp("saveRepairScan", {
      mechanic_id: mechanicId,
      mechanic_name: mechanicName,
      bike_id: bikeId,
      qr_raw: decodedText
    });

    if (!response.success) {
      status.className = "scan-status error";
      status.innerText = response.message || "Erreur lors de l’enregistrement";
      scanLocked = false;
      return;
    }

    playSuccessBeep();
    flashScannerSuccess();

    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    status.className = "scan-status success";
    status.innerText = "Vélo " + bikeId + " enregistré";

    await loadMechanicDashboard();

    setTimeout(async () => {
      await closeScanner();
    }, 450);

  } catch (error) {
    console.error(error);
    status.className = "scan-status error";
    status.innerText = "Erreur de connexion au serveur";
    scanLocked = false;
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
  loadMechanicDashboard();
}

async function loadMechanicDashboard() {
  const mechanicId = localStorage.getItem("user_id") || "";

  try {
    const response = await apiJsonp("mechanicDashboard", {
      mechanic_id: mechanicId
    });

    if (!response.success) {
      renderDashboard({
        validated: 0,
        pending: 0,
        returned: 0,
        recent: []
      });
      return;
    }

    renderDashboard(response);
  } catch (error) {
    console.error(error);
    renderDashboard({
      validated: 0,
      pending: 0,
      returned: 0,
      recent: []
    });
  }
}

function renderDashboard(data) {
  document.getElementById("validatedCount").innerText = String(data.validated || 0);
  document.getElementById("pendingCount").innerText = String(data.pending || 0);
  document.getElementById("returnedCount").innerText = String(data.returned || 0);

  const recentList = document.getElementById("recentList");
  const recent = Array.isArray(data.recent) ? data.recent : [];

  if (recent.length === 0) {
    recentList.innerHTML = `<div class="empty-state">Aucun scan pour le moment</div>`;
    return;
  }

  recentList.innerHTML = recent.map(item => {
    const badgeClass = getBadgeClass(item.status);
    const badgeLabel = getStatusLabel(item.status);

    return `
      <div class="history-item">
        <div class="history-top">
          <div class="bike-id">${escapeHtml(item.bike_id || "")}</div>
          <div class="badge ${badgeClass}">${badgeLabel}</div>
        </div>
        <div class="history-meta">Scanné à ${escapeHtml(item.scanned_at || "")}</div>
      </div>
    `;
  }).join("");
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

function flashScannerSuccess() {
  const modal = document.getElementById("scannerModal");
  const sheet = modal.querySelector(".scanner-sheet");
  const readerBox = document.getElementById("qr-reader");

  modal.classList.add("scan-success");
  sheet.classList.add("scan-success");
  readerBox.classList.add("scan-success");
}

function clearScannerSuccessUI() {
  const modal = document.getElementById("scannerModal");
  if (!modal) return;

  const sheet = modal.querySelector(".scanner-sheet");
  const readerBox = document.getElementById("qr-reader");

  modal.classList.remove("scan-success");
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
