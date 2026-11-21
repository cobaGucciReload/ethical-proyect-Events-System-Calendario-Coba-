const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector(".primary-button");
const formMessage = document.querySelector(".form-message");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");

passwordToggle.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    passwordToggle.setAttribute("aria-pressed", String(!isVisible));
    passwordToggle.setAttribute("aria-label", isVisible ? "Mostrar contraseña" : "Ocultar contraseña");
});

loginForm.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
        input.closest(".form-field").classList.remove("has-error");
        formMessage.textContent = "";
        formMessage.classList.remove("success");
    });
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.querySelector("#email");
    const username = document.querySelector("#username");
    const fields = [email, username, passwordInput];
    let firstEmptyField = null;

    fields.forEach((field) => {
        if (!field.value.trim()) {
            field.closest(".form-field").classList.add("has-error");
            firstEmptyField ||= field;
        }
    });

    if (firstEmptyField) {
        formMessage.textContent = "Completa todos los campos para continuar.";
        formMessage.classList.remove("success");
        firstEmptyField.focus();
        return;
    }

    if (!email.validity.valid) {
        email.closest(".form-field").classList.add("has-error");
        formMessage.textContent = "Ingresa un correo electrónico válido.";
        formMessage.classList.remove("success");
        email.focus();
        return;
    }

    loginButton.disabled = true;
    loginButton.querySelector("span").textContent = "Verificando...";
    formMessage.textContent = "";

    window.setTimeout(() => {
        formMessage.textContent = "Tus datos están listos para conectar con el sistema.";
        formMessage.classList.add("success");
        loginButton.disabled = false;
        loginButton.querySelector("span").textContent = "Iniciar sesión";
    }, 700);
});

console.log("Calendario Coba initialized");
alert(`Welcome ${username}`);