function login() {
  const loginValue = document.getElementById("login").value.trim();
  const passwordValue = document.getElementById("password").value.trim();
  const message = document.getElementById("message");

  message.innerText = "Connexion...";

  const callbackName = "remorqLoginCallback_" + Date.now();

  window[callbackName] = function (data) {
    try {
      if (data.success) {
        localStorage.setItem("user_id", data.user_id || "");
        localStorage.setItem("user_name", data.name || "");
        localStorage.setItem("user_role", data.role || "");

        if (data.role === "MECANO") {
          window.location.href = "mechanic.html";
        } else if (data.role === "RESPONSABLE") {
          window.location.href = "manager.html";
        } else {
          message.innerText = "Rôle invalide";
        }
      } else {
        message.innerText = data.message || "Login incorrect";
      }
    } finally {
      delete window[callbackName];
    }
  };

  const script = document.createElement("script");
  script.src =
    API_URL +
    "?action=login" +
    "&login=" + encodeURIComponent(loginValue) +
    "&password=" + encodeURIComponent(passwordValue) +
    "&callback=" + encodeURIComponent(callbackName);

  script.onerror = function () {
    message.innerText = "Erreur de connexion au serveur";
    delete window[callbackName];
  };

  document.body.appendChild(script);
}
