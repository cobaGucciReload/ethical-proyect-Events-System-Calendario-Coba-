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
        document.getElementById("event-section").style.display = "block";

        renderEvents();
        
        formMessage.textContent = "Tus datos están listos para conectar con el sistema.";
        formMessage.classList.add("success");
        document.getElementById("event-section").style.display = "block";

        loginForm.style.display = "none";
        loginButton.disabled = false;
        loginButton.querySelector("span").textContent = "Iniciar sesión";
    }, 700);

    const events = [];

document.addEventListener("click", (event) => {

    if (event.target.id === "create-event-btn") {

        const eventName =
            document.getElementById("event-name");

        const eventDate =
            document.getElementById("event-date");

        if (
            eventName.value.trim() === "" ||
            eventDate.value === ""
        ) {
            alert("Completa todos los campos");
            return;
        }

        events.push({
            nombre: eventName.value,
            fecha: eventDate.value
        });

        const item =
            document.createElement("li");

        item.textContent =
            `${eventName.value} - ${eventDate.value}`;

        document
            .getElementById("event-list")
            .appendChild(item);

        eventName.value = "";
        eventDate.value = "";

        console.log(events);
    }
    let events = JSON.parse(localStorage.getItem("events")) || [];

function renderEvents() {

    const eventList = document.getElementById("event-list");

    if (!eventList) return;

    eventList.innerHTML = "";

    events.forEach((evento, index) => {

        const item = document.createElement("li");

        item.innerHTML = `
            ${evento.nombre} - ${evento.fecha}
            <button onclick="deleteEvent(${index})">
                Eliminar
            </button>
        `;

        eventList.appendChild(item);

    });

}

function deleteEvent(index) {

    events.splice(index, 1);

    localStorage.setItem(
        "events",
        JSON.stringify(events)
    );

    renderEvents();
}

document.addEventListener("click", (event) => {

    if (event.target.id === "create-event-btn") {

        const eventName =
            document.getElementById("event-name");

        const eventDate =
            document.getElementById("event-date");

        if (
            eventName.value.trim() === "" ||
            eventDate.value === ""
        ) {
            alert("Completa todos los campos");
            return;
        }

        events.push({
            nombre: eventName.value,
            fecha: eventDate.value
        });

        localStorage.setItem(
            "events",
            JSON.stringify(events)
        );

        renderEvents();

        eventName.value = "";
        eventDate.value = "";
    }

});

renderEvents();
    
});

});

console.log("Calendario Coba initialized");
