"use strict";

const STORAGE_KEYS = {
    user: "calendarioCoba.activeUser"
};

const loginForm = document.querySelector("#login-form");
const loginCard = document.querySelector(".login-card");
const welcomePanel = document.querySelector(".welcome-panel");
const loginMessage = document.querySelector(".form-message");
const passwordInput = document.querySelector("#password");
const dashboard = document.querySelector("#dashboard");
const appMessage = document.querySelector("#app-message");
const eventForm = document.querySelector("#event-form");
const eventList = document.querySelector("#event-list");
const eventNameInput = document.querySelector("#event-name");
const eventDescriptionInput = document.querySelector("#event-description");
const eventDateInput = document.querySelector("#event-date");
const eventTimeInput = document.querySelector("#event-time");
const eventCategoryInput = document.querySelector("#event-category");
const focusTimerLabel = document.querySelector("#focus-timer");
const focusProgress = document.querySelector(".focus-progress");
const focusProgressBar = document.querySelector("#focus-progress-bar");
const focusStatus = document.querySelector("#focus-status");

console.warn(
    "[SprecialAccess] Review special access conditions."
);

console.warn(
    "[Review Criterias by User Suspect] Review event classification criteria."
);

console.warn(
    "[Personal Id Optimization] Review personal information handling."
);

let activeUser = null;
let events = [];
let editingEventId = null;
let selectedDate = new Date();
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let focusState = createInitialFocusState(25);
let focusInterval = null;
let messageTimeout = null;

// Aísla los datos de agenda y concentración para cada perfil local.
function getUserStorageKey(section) {
    return `calendarioCoba.${section}.${encodeURIComponent(activeUser.email)}`;
}

// Genera identificadores únicos incluso en navegadores sin crypto.randomUUID.
function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Construye el estado inicial del temporizador para la duración seleccionada.
function createInitialFocusState(minutes) {
    return {
        durationSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
        accumulatedSeconds: 0,
        startedAt: null,
        running: false
    };
}

// Muestra mensajes de éxito o error en la zona de estado del dashboard.
function showMessage(message, type) {
    if (!appMessage) return;
    if (dashboard.hidden) {
        loginMessage.textContent = message;
        return;
    }
    appMessage.textContent = message;
    appMessage.classList.toggle("is-error", type === "error");
    appMessage.classList.toggle("is-visible", Boolean(message));
    window.clearTimeout(messageTimeout);
    if (message) {
        messageTimeout = window.setTimeout(() => {
            appMessage.classList.remove("is-visible");
        }, 4500);
    }
}

// Devuelve la fecha local en formato ISO sin desplazamientos de zona horaria.
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Carga los eventos locales y adapta registros del formato simple anterior.
function loadEvents() {
    try {
        const userEventsKey = getUserStorageKey("events");
        let storedEvents = localStorage.getItem(userEventsKey);
        let shouldMigrate = false;
        if (storedEvents === null) {
            storedEvents = localStorage.getItem("events");
            shouldMigrate = storedEvents !== null;
        }
        if (storedEvents === null) return [];

        const parsedEvents = JSON.parse(storedEvents);
        if (!Array.isArray(parsedEvents)) {
            throw new Error("El formato guardado de eventos no es válido.");
        }
        const loadedEvents = parsedEvents
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
                id: String(item.id || createId()),
                name: String(item.name || item.nombre || "").trim(),
                description: String(item.description || "Sin descripción"),
                date: String(item.date || item.fecha || ""),
                time: String(item.time || "00:00"),
                category: String(item.category || "Otro")
            }))
            .filter((item) => item.name && /^\d{4}-\d{2}-\d{2}$/.test(item.date));

        if (shouldMigrate) {
            localStorage.setItem(userEventsKey, JSON.stringify(loadedEvents));
        }
        return loadedEvents;
    } catch (error) {
        showMessage(`No se pudieron cargar los eventos: ${error.message}`, "error");
        return [];
    }
}

// Persiste los eventos y vuelve a dibujar las vistas dependientes de ellos.
function saveEvents() {
    try {
        localStorage.setItem(getUserStorageKey("events"), JSON.stringify(events));
        renderEvents();
        renderCalendar();
        renderStatistics();
    } catch (error) {
        showMessage(`No se pudieron guardar los eventos: ${error.message}`, "error");
    }
}

// Crea un evento validado o guarda los cambios del evento que se está editando.
function createEvent(event) {
    event.preventDefault();
    if (!eventForm.reportValidity()) {
        showMessage("Completa todos los campos del evento.", "error");
        return;
    }

    const name = eventNameInput.value.trim();
    const description = eventDescriptionInput.value.trim();
    if (!name || !description) {
        showMessage("El nombre y la descripción no pueden estar vacíos.", "error");
        return;
    }

    const eventData = {
        name,
        description,
        date: eventDateInput.value,
        time: eventTimeInput.value,
        category: eventCategoryInput.value
    };

    if (editingEventId) {
        events = events.map((item) => item.id === editingEventId ? { ...item, ...eventData } : item);
        showMessage("Evento actualizado correctamente.", "success");
    } else {
        events.push({ id: createId(), ...eventData });
        showMessage("Evento creado correctamente.", "success");
    }

    events.sort((first, second) =>
        `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`)
    );
    saveEvents();
    eventForm.reset();
    editingEventId = null;
    document.querySelector("#event-form-title").textContent = "Crear Evento";
    document.querySelector("#create-event-btn span").textContent = "Crear Evento";
    document.querySelector("#cancel-edit-button").hidden = true;
}

// Elimina un evento después de pedir confirmación y sincroniza el almacenamiento.
function deleteEvent(eventId) {
    const eventToDelete = events.find((item) => item.id === eventId);
    if (!eventToDelete || !window.confirm(`¿Eliminar "${eventToDelete.name}"?`)) return;
    events = events.filter((item) => item.id !== eventId);
    saveEvents();
    showMessage("Evento eliminado.", "success");
}

// Carga un evento existente en el formulario para poder modificarlo.
function editEvent(eventId) {
    const eventToEdit = events.find((item) => item.id === eventId);
    if (!eventToEdit) return;
    editingEventId = eventId;
    eventNameInput.value = eventToEdit.name;
    eventDescriptionInput.value = eventToEdit.description;
    eventDateInput.value = eventToEdit.date;
    eventTimeInput.value = eventToEdit.time;
    eventCategoryInput.value = eventToEdit.category;
    document.querySelector("#event-form-title").textContent = "Editar Evento";
    document.querySelector("#create-event-btn span").textContent = "Guardar cambios";
    document.querySelector("#cancel-edit-button").hidden = false;
    eventNameInput.focus();
}

// Dibuja la lista de eventos ordenada y enlaza acciones sin insertar HTML del usuario.
function renderEvents() {
    eventList.replaceChildren();
    const sortedEvents = [...events].sort((first, second) =>
        `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`)
    );
    document.querySelector("#empty-events").hidden = sortedEvents.length > 0;

    sortedEvents.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.className = "event-item";

        const details = document.createElement("div");
        details.className = "event-item__details";
        const title = document.createElement("strong");
        title.textContent = item.name;
        const meta = document.createElement("span");
        meta.textContent = `${formatDisplayDate(item.date)} · ${item.time} · ${item.category}`;
        const description = document.createElement("p");
        description.textContent = item.description;
        details.append(title, meta, description);

        const actions = document.createElement("div");
        actions.className = "event-item__actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.eventId = item.id;
        editButton.textContent = "Editar";
        editButton.setAttribute("aria-label", `Editar ${item.name}`);
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.eventId = item.id;
        deleteButton.textContent = "Eliminar";
        deleteButton.setAttribute("aria-label", `Eliminar ${item.name}`);
        actions.append(editButton, deleteButton);

        listItem.append(details, actions);
        eventList.append(listItem);
    });
}

// Da formato legible a una fecha almacenada como año-mes-día.
function formatDisplayDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" })
        .format(new Date(year, month - 1, day));
}

// Dibuja el mes real, marca hoy y los días con eventos, y lista la fecha seleccionada.
function renderCalendar() {
    const grid = document.querySelector("#calendar-grid");
    const monthLabel = document.querySelector("#calendar-month");
    const yearLabel = document.querySelector("#calendar-year");
    const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const today = formatLocalDate(new Date());

    monthLabel.textContent = new Intl.DateTimeFormat("es", { month: "long" }).format(calendarMonth);
    yearLabel.textContent = year;
    grid.replaceChildren();

    weekdays.forEach((day) => {
        const weekday = document.createElement("span");
        weekday.className = "calendar-weekday";
        weekday.textContent = day;
        weekday.setAttribute("role", "columnheader");
        grid.append(weekday);
    });

    for (let cell = 0; cell < 42; cell += 1) {
        let date;
        let inCurrentMonth = true;
        if (cell < firstDayOffset) {
            date = new Date(year, month - 1, previousMonthDays - firstDayOffset + cell + 1);
            inCurrentMonth = false;
        } else if (cell >= firstDayOffset + daysInMonth) {
            date = new Date(year, month + 1, cell - firstDayOffset - daysInMonth + 1);
            inCurrentMonth = false;
        } else {
            date = new Date(year, month, cell - firstDayOffset + 1);
        }

        const isoDate = formatLocalDate(date);
        const dayButton = document.createElement("button");
        dayButton.type = "button";
        dayButton.className = "calendar-day";
        dayButton.textContent = date.getDate();
        dayButton.dataset.date = isoDate;
        dayButton.setAttribute("role", "gridcell");
        dayButton.setAttribute("aria-label", formatDisplayDate(isoDate));
        if (!inCurrentMonth) dayButton.classList.add("is-outside-month");
        if (isoDate === today) dayButton.classList.add("is-today");
        if (isoDate === formatLocalDate(selectedDate)) dayButton.classList.add("is-selected");
        if (events.some((item) => item.date === isoDate)) {
            dayButton.classList.add("has-event");
            dayButton.setAttribute("aria-label", `${formatDisplayDate(isoDate)}, con eventos`);
        }
        grid.append(dayButton);
    }

    const selectedIsoDate = formatLocalDate(selectedDate);
    document.querySelector("#selected-date-title").textContent = formatDisplayDate(selectedIsoDate);
    const selectedEvents = events
        .filter((item) => item.date === selectedIsoDate)
        .sort((first, second) => first.time.localeCompare(second.time));
    const selectedList = document.querySelector("#selected-date-events");
    selectedList.replaceChildren();
    if (selectedEvents.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "No hay eventos para este día.";
        selectedList.append(emptyItem);
    } else {
        selectedEvents.forEach((item) => {
            const listItem = document.createElement("li");
            listItem.textContent = `${item.time} · ${item.name}`;
            selectedList.append(listItem);
        });
    }
}

// Actualiza los contadores de eventos y el tiempo de concentración acumulado.
function renderStatistics() {
    const today = formatLocalDate(new Date());
    document.querySelector("#stat-total").textContent = events.length;
    document.querySelector("#stat-pending").textContent =
        events.filter((item) => item.date >= today).length;
    document.querySelector("#stat-today").textContent =
        events.filter((item) => item.date === today).length;
    const liveSeconds = focusState.running
        ? Math.min(focusState.remainingSeconds, Math.floor((Date.now() - focusState.startedAt) / 1000))
        : 0;
    const totalSeconds = focusState.accumulatedSeconds + liveSeconds;
    document.querySelector("#stat-focus").textContent =
        `${Math.floor(totalSeconds / 60)} min${totalSeconds % 60 ? ` ${totalSeconds % 60} s` : ""}`;
}

// Valida el formulario de acceso y crea una sesión local sin guardar la contraseña.
function login(event) {
    event.preventDefault();
    const email = document.querySelector("#email");
    const username = document.querySelector("#username");
    const fields = [email, username, passwordInput];
    let firstInvalidField = null;

    fields.forEach((field) => {
        const fieldContainer = field.closest(".form-field");
        const invalid = !field.value.trim() || (field === email && !field.validity.valid);
        fieldContainer.classList.toggle("has-error", invalid);
        if (invalid && !firstInvalidField) firstInvalidField = field;
    });

    if (firstInvalidField) {
        loginMessage.textContent = firstInvalidField === email && email.value.trim()
            ? "Ingresa un correo electrónico válido."
            : "Completa todos los campos para continuar.";
        loginMessage.classList.remove("success");
        firstInvalidField.focus();
        return;
    }

    activeUser = { email: email.value.trim().toLowerCase(), username: username.value.trim() };
    try {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(activeUser));
    } catch (error) {
        activeUser = null;
        loginMessage.textContent = `No se pudo guardar la sesión local: ${error.message}`;
        loginMessage.classList.remove("success");
        return;
    }
    openDashboard();
}

// Presenta el dashboard del usuario activo y carga sus datos almacenados localmente.
function openDashboard() {
    if (!activeUser) return;
    welcomePanel.hidden = true;
    loginCard.hidden = true;
    dashboard.hidden = false;
    document.querySelector("#welcome-message").textContent = `Bienvenido, ${activeUser.username}. Aquí tienes tu agenda.`;
    events = loadEvents();
    renderEvents();
    renderCalendar();
    restoreFocusTimer();
}

// Cierra la sesión local y devuelve la interfaz a la pantalla de acceso.
function logout() {
    try {
        localStorage.removeItem(STORAGE_KEYS.user);
    } catch (error) {
        showMessage(`No se pudo cerrar la sesión: ${error.message}`, "error");
        return;
    }
    activeUser = null;
    dashboard.hidden = true;
    welcomePanel.hidden = false;
    loginCard.hidden = false;
    loginForm.reset();
    loginMessage.textContent = "";
    showMessage("", "");
}

// Recupera el temporizador persistido y valida sus valores antes de usarlos.
function loadFocusState() {
    try {
        const stored = localStorage.getItem(getUserStorageKey("focus"));
        if (stored === null) return createInitialFocusState(25);
        const parsed = JSON.parse(stored);
        if (
            !Number.isFinite(parsed.durationSeconds) ||
            !Number.isFinite(parsed.remainingSeconds) ||
            !Number.isFinite(parsed.accumulatedSeconds) ||
            parsed.durationSeconds < 60 ||
            parsed.remainingSeconds < 0 ||
            parsed.remainingSeconds > parsed.durationSeconds
        ) {
            throw new Error("El estado guardado del temporizador no es válido.");
        }
        return {
            durationSeconds: parsed.durationSeconds,
            remainingSeconds: parsed.remainingSeconds,
            accumulatedSeconds: Math.max(0, parsed.accumulatedSeconds),
            startedAt: Number.isFinite(parsed.startedAt) ? parsed.startedAt : null,
            running: Boolean(parsed.running && Number.isFinite(parsed.startedAt))
        };
    } catch (error) {
        showMessage(`No se pudo recuperar el temporizador: ${error.message}`, "error");
        return createInitialFocusState(25);
    }
}

// Guarda el estado actual del temporizador para conservarlo al recargar la página.
function saveFocusState() {
    try {
        localStorage.setItem(getUserStorageKey("focus"), JSON.stringify(focusState));
    } catch (error) {
        showMessage(`No se pudo guardar el temporizador: ${error.message}`, "error");
    }
}

// Actualiza el contador y la barra de progreso del modo de concentración.
function updateFocusDisplay() {
    let remaining = focusState.remainingSeconds;
    if (focusState.running && focusState.startedAt !== null) {
        remaining = Math.max(0, remaining - Math.floor((Date.now() - focusState.startedAt) / 1000));
    }
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    focusTimerLabel.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const progress = Math.round(((focusState.durationSeconds - remaining) / focusState.durationSeconds) * 100);
    focusProgressBar.style.width = `${progress}%`;
    focusProgress.setAttribute("aria-valuenow", progress);
    document.querySelector("#focus-start").disabled = focusState.running;
    document.querySelector("#focus-pause").disabled = !focusState.running;
    focusStatus.textContent = focusState.running
        ? "En concentración"
        : remaining === 0 ? "¡Sesión completada!" : "Listo para comenzar";
    document.querySelector(".focus-card").classList.toggle("is-complete", remaining === 0);
    renderStatistics();
}

// Inicia o continúa el temporizador y lo mantiene sincronizado con el reloj.
function startFocusTimer() {
    if (focusState.running) return;
    if (focusState.remainingSeconds === 0) {
        focusState.remainingSeconds = focusState.durationSeconds;
    }
    focusState.startedAt = Date.now();
    focusState.running = true;
    saveFocusState();
    updateFocusDisplay();
    window.clearInterval(focusInterval);
    focusInterval = window.setInterval(() => {
        updateFocusDisplay();
        const elapsed = Math.floor((Date.now() - focusState.startedAt) / 1000);
        if (elapsed >= focusState.remainingSeconds) {
            completeFocusTimer();
        }
    }, 250);
}

// Pausa el temporizador, registra el tiempo trabajado y guarda el tiempo restante.
function pauseFocusTimer() {
    if (!focusState.running) return;
    const elapsed = Math.min(
        focusState.remainingSeconds,
        Math.floor((Date.now() - focusState.startedAt) / 1000)
    );
    focusState.remainingSeconds -= elapsed;
    focusState.accumulatedSeconds += elapsed;
    focusState.startedAt = null;
    focusState.running = false;
    window.clearInterval(focusInterval);
    saveFocusState();
    updateFocusDisplay();
}

// Reinicia la duración elegida, contabilizando el tramo activo antes de resetear.
function resetFocusTimer() {
    if (focusState.running) {
        const elapsed = Math.min(
            focusState.remainingSeconds,
            Math.floor((Date.now() - focusState.startedAt) / 1000)
        );
        focusState.accumulatedSeconds += elapsed;
    }
    focusState.remainingSeconds = focusState.durationSeconds;
    focusState.startedAt = null;
    focusState.running = false;
    window.clearInterval(focusInterval);
    saveFocusState();
    updateFocusDisplay();
}

// Finaliza una sesión completa, la registra y muestra una alerta visual.
function completeFocusTimer() {
    if (!focusState.running) return;
    focusState.accumulatedSeconds += focusState.remainingSeconds;
    focusState.remainingSeconds = 0;
    focusState.startedAt = null;
    focusState.running = false;
    window.clearInterval(focusInterval);
    saveFocusState();
    updateFocusDisplay();
    showMessage("¡Excelente! Completaste tu sesión de concentración.", "success");
}

// Restaura la sesión de concentración del usuario y reanuda el reloj si estaba activo.
function restoreFocusTimer() {
    focusState = loadFocusState();
    if (focusState.running) {
        const elapsed = Math.floor((Date.now() - focusState.startedAt) / 1000);
        if (elapsed >= focusState.remainingSeconds) {
            completeFocusTimer();
        } else {
            focusState.remainingSeconds -= elapsed;
            focusState.accumulatedSeconds += elapsed;
            focusState.startedAt = null;
            focusState.running = false;
            saveFocusState();
            startFocusTimer();
        }
    }
    document.querySelectorAll("[data-focus-minutes]").forEach((button) => {
        button.classList.toggle(
            "is-selected",
            Number(button.dataset.focusMinutes) * 60 === focusState.durationSeconds
        );
    });
    updateFocusDisplay();
}

passwordInput.closest(".input-shell").querySelector(".password-toggle").addEventListener("click", (event) => {
    const toggle = event.currentTarget;
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!isVisible));
    toggle.setAttribute("aria-label", isVisible ? "Mostrar contraseña" : "Ocultar contraseña");
});

loginForm.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
        const field = input.closest(".form-field");
        if (!field) return;
        field.classList.remove("has-error");
        loginMessage.textContent = "";
        loginMessage.classList.remove("success");
    });
});

loginForm.addEventListener("submit", login);
eventForm.addEventListener("submit", createEvent);
document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelector(".signup-button").addEventListener("click", () => {
    loginMessage.textContent = "No se necesita crear una cuenta: el perfil se guarda solo en este dispositivo.";
});
document.querySelector(".form-options .text-button").addEventListener("click", () => {
    loginMessage.textContent = "Esta versión no almacena contraseñas ni ofrece recuperación de cuentas.";
});
document.querySelector("#cancel-edit-button").addEventListener("click", () => {
    editingEventId = null;
    eventForm.reset();
    document.querySelector("#event-form-title").textContent = "Crear Evento";
    document.querySelector("#create-event-btn span").textContent = "Crear Evento";
    document.querySelector("#cancel-edit-button").hidden = true;
});

eventList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit") editEvent(button.dataset.eventId);
    if (button.dataset.action === "delete") deleteEvent(button.dataset.eventId);
});

document.querySelector("#calendar-previous").addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
});
document.querySelector("#calendar-next").addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
});
document.querySelector("#calendar-grid").addEventListener("click", (event) => {
    const dayButton = event.target.closest("button[data-date]");
    if (!dayButton) return;
    const [year, month, day] = dayButton.dataset.date.split("-").map(Number);
    selectedDate = new Date(year, month - 1, day);
    calendarMonth = new Date(year, month - 1, 1);
    renderCalendar();
});

document.querySelectorAll("[data-focus-minutes]").forEach((button) => {
    button.addEventListener("click", () => {
        if (focusState.running) return;
        const minutes = Number(button.dataset.focusMinutes);
        focusState.durationSeconds = minutes * 60;
        focusState.remainingSeconds = minutes * 60;
        document.querySelectorAll("[data-focus-minutes]").forEach((option) => {
            option.classList.toggle("is-selected", option === button);
        });
        saveFocusState();
        updateFocusDisplay();
    });
});
document.querySelector("#focus-start").addEventListener("click", startFocusTimer);
document.querySelector("#focus-pause").addEventListener("click", pauseFocusTimer);
document.querySelector("#focus-reset").addEventListener("click", resetFocusTimer);

try {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (storedUser !== null) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser.email === "string" && typeof parsedUser.username === "string") {
            activeUser = parsedUser;
            openDashboard();
        } else {
            throw new Error("Los datos de sesión guardados no son válidos.");
        }
    }
} catch (error) {
    loginMessage.textContent = `No se pudo recuperar la sesión: ${error.message}`;
}

console.log("Calendario Coba initialized");
