async function login() {
  const loginValue = document.getElementById("login").value.trim();
  const passwordValue = document.getElementById("password").value.trim();
  const message = document.getElementById("message");

  message.innerText = "Connexion...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        login: loginValue,
        password: passwordValue
      })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_role", data.role);

      if (data.role === "MECANO") {
        window.location.href = "mechanic.html";
      } else if (data.role === "RESPONSABLE") {
        window.location.href = "manager.html";
      } else {
        message.innerText = "Rôle invalide";
      }
    } else {
      message.innerText = "Login ou mot de passe incorrect";
    }
  } catch (error) {
    message.innerText = "Erreur de connexion au serveur";
    console.error(error);
  }
}
