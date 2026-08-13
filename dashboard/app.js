/* =========================================================
   NR TICKET — DASHBOARD APP
   dashboard/js/app.js
   ========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CONFIGURACIÓN
       ===================================================== */

    const API = "/api";

    const state = {
        user: null,
        guilds: [],
        selectedGuild: null,
        panels: [],
        currentPanel: null
    };

    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    /* =====================================================
       UTILIDADES
       ===================================================== */

    function escapeHTML(value = "") {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showNotification(message, type = "info") {
        let container = $("#notifications");

        if (!container) {
            container = document.createElement("div");
            container.id = "notifications";
            container.className = "notifications";
            document.body.appendChild(container);
        }

        const notification = document.createElement("div");

        notification.className = `notification notification-${type}`;

        notification.innerHTML = `
            <div class="notification-icon">
                ${type === "success" ? "✓" : type === "error" ? "!" : "i"}
            </div>

            <div class="notification-content">
                ${escapeHTML(message)}
            </div>

            <button class="notification-close">×</button>
        `;

        container.appendChild(notification);

        notification
            .querySelector(".notification-close")
            .addEventListener("click", () => {
                notification.remove();
            });

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async function request(url, options = {}) {

        try {

            const response = await fetch(url, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                },
                ...options
            });

            if (response.status === 401) {
                window.location.href = "/";
                return null;
            }

            const contentType =
                response.headers.get("content-type") || "";

            let data;

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(
                    typeof data === "object"
                        ? data.message || "Error en la solicitud"
                        : data
                );
            }

            return data;

        } catch (error) {

            console.error("NR TICKET API:", error);

            showNotification(
                error.message || "No se pudo completar la solicitud.",
                "error"
            );

            throw error;
        }
    }

    /* =====================================================
       LOGIN / USUARIO
       ===================================================== */

    async function loadUser() {

        try {

            const data = await request(`${API}/user`);

            if (!data) return;

            state.user = data.user || data;

            renderUser();

        } catch {
            console.warn("No se pudo cargar el usuario.");
        }
    }

    function renderUser() {

        if (!state.user) return;

        const avatar =
            state.user.avatar ||
            state.user.avatarURL ||
            "https://cdn.discordapp.com/embed/avatars/0.png";

        const username =
            state.user.username ||
            state.user.global_name ||
            "Usuario";

        const avatarElements = $$("[data-user-avatar]");

        avatarElements.forEach(element => {
            element.src = avatar;
        });

        const nameElements = $$("[data-user-name]");

        nameElements.forEach(element => {
            element.textContent = username;
        });
    }

    /* =====================================================
       SERVIDORES
       ===================================================== */

    async function loadGuilds() {

        try {

            const data = await request(`${API}/user/guilds`);

            if (!data) return;

            state.guilds = Array.isArray(data)
                ? data
                : data.guilds || [];

            renderGuilds();

        } catch {
            renderGuilds();
        }
    }

    function renderGuilds() {

        const container =
            $("#guild-list") ||
            $("[data-guild-list]");

        if (!container) return;

        container.innerHTML = "";

        if (!state.guilds.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🌐</div>
                    <h3>No hay servidores disponibles</h3>
                    <p>No encontramos servidores que puedas administrar.</p>
                </div>
            `;

            return;
        }

        state.guilds.forEach(guild => {

            const card = document.createElement("div");

            card.className = "guild-card";

            const icon = guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                : "https://cdn.discordapp.com/embed/avatars/0.png";

            const canManage =
                guild.manageable !== false &&
                guild.canManage !== false;

            card.innerHTML = `
                <div class="guild-icon">
                    <img src="${icon}" alt="">
                </div>

                <div class="guild-information">
                    <h3>${escapeHTML(guild.name || "Servidor")}</h3>

                    <span class="guild-members">
                        👥 ${Number(guild.memberCount || 0).toLocaleString()}
                        miembros
                    </span>

                    <span class="guild-status ${canManage ? "online" : "offline"}">
                        ${canManage ? "🟢 Bot disponible" : "🔴 Sin permisos"}
                    </span>
                </div>

                <div class="guild-action">

                    ${
                        canManage
                            ? `<button class="btn-primary" data-manage-guild="${guild.id}">
                                ⚙️ Administrar
                               </button>`
                            : `<button class="btn-secondary" data-invite-guild="${guild.id}">
                                ➕ Invitar
                               </button>`
                    }

                </div>
            `;

            container.appendChild(card);
        });

        $$("[data-manage-guild]").forEach(button => {

            button.addEventListener("click", () => {

                const guildId =
                    button.dataset.manageGuild;

                selectGuild(guildId);
            });
        });

        $$("[data-invite-guild]").forEach(button => {

            button.addEventListener("click", () => {

                const guildId =
                    button.dataset.inviteGuild;

                inviteBot(guildId);
            });
        });
    }

    /* =====================================================
       SELECCIONAR SERVIDOR
       ===================================================== */

    async function selectGuild(guildId) {

        const guild =
            state.guilds.find(g => String(g.id) === String(guildId));

        if (!guild) {
            showNotification(
                "No tienes acceso a este servidor.",
                "error"
            );

            return;
        }

        const canManage =
            guild.manageable !== false &&
            guild.canManage !== false;

        if (!canManage) {

            showNotification(
                "No tienes permisos para administrar este servidor.",
                "error"
            );

            return;
        }

        state.selectedGuild = guild;

        localStorage.setItem(
            "nr_ticket_selected_guild",
            guild.id
        );

        updateGuildUI();

        await loadGuildData(guild.id);

        showSection("server");
    }

    function updateGuildUI() {

        if (!state.selectedGuild) return;

        const guild = state.selectedGuild;

        const elements = $$("[data-selected-guild]");

        elements.forEach(element => {
            element.textContent = guild.name;
        });

        const icon = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
            : "https://cdn.discordapp.com/embed/avatars/0.png";

        $$("[data-selected-guild-icon]").forEach(element => {
            element.src = icon;
        });
    }

    function inviteBot(guildId) {

        const clientId =
            document.body.dataset.clientId ||
            window.NR_TICKET_CLIENT_ID;

        if (!clientId) {

            showNotification(
                "No se configuró el CLIENT_ID del bot.",
                "error"
            );

            return;
        }

        const permissions = "8";

        const url =
            `https://discord.com/oauth2/authorize` +
            `?client_id=${encodeURIComponent(clientId)}` +
            `&permissions=${permissions}` +
            `&scope=bot%20applications.commands` +
            `&guild_id=${encodeURIComponent(guildId)}`;

        window.open(url, "_blank");
    }

    /* =====================================================
       DATOS DEL SERVIDOR
       ===================================================== */

    async function loadGuildData(guildId) {

        try {

            const data =
                await request(`${API}/guilds/${guildId}/data`);

            if (!data) return;

            state.panels =
                data.panels ||
                data.ticketPanels ||
                [];

            renderPanels();

            populateServerSettings(data);

        } catch {

            state.panels = [];

            renderPanels();
        }
    }

    function populateServerSettings(data) {

        const config = data.config || data;

        $$("[data-setting]").forEach(element => {

            const key =
                element.dataset.setting;

            if (config[key] !== undefined) {

                if (element.type === "checkbox") {
                    element.checked = Boolean(config[key]);
                } else {
                    element.value = config[key];
                }
            }
        });
    }

    /* =====================================================
       NAVEGACIÓN
       ===================================================== */

    function showSection(section) {

        $$("[data-section]").forEach(element => {

            element.classList.toggle(
                "active",
                element.dataset.section === section
            );
        });

        $$("[data-page]").forEach(element => {

            element.classList.toggle(
                "active",
                element.dataset.page === section
            );
        });
    }

    $$("[data-section]").forEach(button => {

        button.addEventListener("click", () => {

            const section =
                button.dataset.section;

            showSection(section);
        });
    });

    /* =====================================================
       SIDEBAR
       ===================================================== */

    const sidebarToggle =
        $("#sidebar-toggle");

    const sidebar =
        $("#sidebar");

    if (sidebarToggle && sidebar) {

        sidebarToggle.addEventListener("click", () => {

            sidebar.classList.toggle("open");
        });
    }

    /* =====================================================
       PANELES DE TICKETS
       ===================================================== */

    function renderPanels() {

        const container =
            $("#ticket-panels") ||
            $("[data-ticket-panels]");

        if (!container) return;

        container.innerHTML = "";

        if (!state.panels.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎫</div>

                    <h3>No tienes paneles creados</h3>

                    <p>
                        Crea tu primer panel de tickets
                        para comenzar.
                    </p>

                    <button
                        class="btn-primary"
                        id="empty-create-panel">
                        ➕ Crear panel
                    </button>
                </div>
            `;

            $("#empty-create-panel")
                ?.addEventListener(
                    "click",
                    openCreatePanel
                );

            return;
        }

        state.panels.forEach(panel => {

            const element =
                document.createElement("div");

            element.className = "ticket-panel-card";

            element.innerHTML = `

                <div class="panel-icon">
                    ${panel.emoji || "🎫"}
                </div>

                <div class="panel-info">

                    <h3>
                        ${escapeHTML(
                            panel.title ||
                            "Panel de tickets"
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            panel.description ||
                            "Sin descripción"
                        )}
                    </p>

                    <span class="panel-type">
                        ${
                            panel.type === "thread"
                                ? "🧵 Hilo privado"
                                : panel.type === "voice"
                                    ? "🔊 Canal de voz"
                                    : "💬 Canal privado"
                        }
                    </span>

                </div>

                <div class="panel-actions">

                    <button
                        class="btn-secondary"
                        data-edit-panel="${panel.id}">
                        ⚙️ Administrar
                    </button>

                    <button
                        class="btn-danger"
                        data-delete-panel="${panel.id}">
                        🗑️ Eliminar
                    </button>

                </div>
            `;

            container.appendChild(element);
        });

        $$("[data-edit-panel]").forEach(button => {

            button.addEventListener("click", () => {

                openEditPanel(
                    button.dataset.editPanel
                );
            });
        });

        $$("[data-delete-panel]").forEach(button => {

            button.addEventListener("click", () => {

                deletePanel(
                    button.dataset.deletePanel
                );
            });
        });
    }

    /* =====================================================
       CREAR PANEL
       ===================================================== */

    function openCreatePanel() {

        state.currentPanel = {
            id: null,
            type: "channel",
            title: "",
            description: "",
            color: "#5865F2",
            image: "",
            thumbnail: "",
            footer: "NR TICKET",
            timestamp: true,
            buttons: [],
            options: [],
            form: null
        };

        openPanelEditor();
    }

    function openEditPanel(panelId) {

        const panel =
            state.panels.find(
                p => String(p.id) === String(panelId)
            );

        if (!panel) {

            showNotification(
                "No se encontró el panel.",
                "error"
            );

            return;
        }

        state.currentPanel =
            JSON.parse(JSON.stringify(panel));

        openPanelEditor();
    }

    function openPanelEditor() {

        const modal =
            $("#panel-editor-modal");

        if (!modal) {

            showNotification(
                "El editor de panel no está disponible en esta página.",
                "error"
            );

            return;
        }

        modal.classList.add("active");

        fillPanelEditor();
    }

    function closePanelEditor() {

        const modal =
            $("#panel-editor-modal");

        if (modal) {
            modal.classList.remove("active");
        }
    }

    function fillPanelEditor() {

        if (!state.currentPanel) return;

        const panel =
            state.currentPanel;

        const fields = {
            "panel-title": panel.title || "",
            "panel-description": panel.description || "",
            "panel-color": panel.color || "#5865F2",
            "panel-image": panel.image || "",
            "panel-thumbnail": panel.thumbnail || "",
            "panel-footer": panel.footer || "NR TICKET"
        };

        Object.entries(fields).forEach(([id, value]) => {

            const element = $(`#${id}`);

            if (element) {
                element.value = value;
            }
        });

        const timestamp =
            $("#panel-timestamp");

        if (timestamp) {
            timestamp.checked =
                panel.timestamp !== false;
        }

        renderButtonEditor();
        renderOptionEditor();
        updatePreview();
    }

    /* =====================================================
       BOTONES
       ===================================================== */

    function renderButtonEditor() {

        const container =
            $("#panel-buttons");

        if (!container) return;

        container.innerHTML = "";

        const buttons =
            state.currentPanel?.buttons || [];

        buttons.forEach((button, index) => {

            const element =
                document.createElement("div");

            element.className =
                "component-item";

            element.innerHTML = `

                <div>
                    <strong>
                        ${escapeHTML(
                            button.emoji || "🔘"
                        )}
                        ${escapeHTML(
                            button.label ||
                            button.name ||
                            "Botón"
                        )}
                    </strong>

                    <small>
                        Botón ${index + 1}
                    </small>
                </div>

                <button
                    class="btn-danger"
                    data-remove-button="${index}">
                    🗑️
                </button>
            `;

            container.appendChild(element);
        });

        $$("[data-remove-button]").forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.removeButton);

                state.currentPanel.buttons.splice(
                    index,
                    1
                );

                renderButtonEditor();
                updatePreview();
            });
        });
    }

    function addButton() {

        if (!state.currentPanel) return;

        if (
            (state.currentPanel.buttons || []).length >= 20
        ) {

            showNotification(
                "El máximo permitido son 20 botones.",
                "error"
            );

            return;
        }

        state.currentPanel.buttons.push({
            label: "Nuevo botón",
            emoji: "🎫",
            style: "primary",
            customId:
                `nr_ticket_${Date.now()}`
        });

        renderButtonEditor();
        updatePreview();
    }

    $("#add-button")
        ?.addEventListener(
            "click",
            addButton
        );

    /* =====================================================
       OPCIONES DEL MENÚ
       ===================================================== */

    function renderOptionEditor() {

        const container =
            $("#panel-options");

        if (!container) return;

        container.innerHTML = "";

        const options =
            state.currentPanel?.options || [];

        options.forEach((option, index) => {

            const element =
                document.createElement("div");

            element.className =
                "component-item";

            element.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                            option.emoji || "📋"
                        )}
                        ${escapeHTML(
                            option.label ||
                            "Opción"
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            option.description ||
                            "Sin descripción"
                        )}
                    </small>

                </div>

                <button
                    class="btn-danger"
                    data-remove-option="${index}">
                    🗑️
                </button>
            `;

            container.appendChild(element);
        });

        $$("[data-remove-option]").forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.removeOption);

                state.currentPanel.options.splice(
                    index,
                    1
                );

                renderOptionEditor();
                updatePreview();
            });
        });
    }

    function addOption() {

        if (!state.currentPanel) return;

        if (
            (state.currentPanel.options || []).length >= 25
        ) {

            showNotification(
                "El máximo permitido son 25 opciones.",
                "error"
            );

            return;
        }

        state.currentPanel.options.push({
            label: "Nueva opción",
            description: "Descripción de la opción",
            emoji: "🎫",
            value:
                `option_${Date.now()}`
        });

        renderOptionEditor();
        updatePreview();
    }

    $("#add-option")
        ?.addEventListener(
            "click",
            addOption
        );

    /* =====================================================
       VISTA PREVIA
       ===================================================== */

    function updatePreview() {

        const preview =
            $("#panel-preview");

        if (!preview || !state.currentPanel) return;

        const panel =
            state.currentPanel;

        const buttons =
            panel.buttons || [];

        preview.innerHTML = `

            <div
                class="discord-preview"
                style="border-left-color:
                ${escapeHTML(panel.color || "#5865F2")}">

                <div class="preview-title">
                    ${escapeHTML(
                        panel.title ||
                        "🎫 Soporte NR TICKET"
                    )}
                </div>

                <div class="preview-description">
                    ${escapeHTML(
                        panel.description ||
                        "Selecciona una opción para recibir ayuda."
                    )}
                </div>

                ${
                    panel.image
                        ? `
                            <img
                                class="preview-image"
                                src="${escapeHTML(panel.image)}"
                                alt="">
                          `
                        : ""
                }

                <div class="preview-buttons">

                    ${
                        buttons.length
                            ? buttons.map(button => `
                                <button>
                                    ${escapeHTML(
                                        button.emoji || ""
                                    )}
                                    ${escapeHTML(
                                        button.label ||
                                        button.name ||
                                        "Botón"
                                    )}
                                </button>
                            `).join("")
                            : `
                                <button>
                                    🎫 Soporte
                                </button>
                            `
                    }

                </div>

                <div class="preview-footer">
                    ${escapeHTML(
                        panel.footer || "NR TICKET"
                    )}
                </div>

            </div>
        `;
    }

    /* =====================================================
       FORMULARIO
       ===================================================== */

    function createForm() {

        if (!state.currentPanel) return;

        state.currentPanel.form = {
            enabled: true,
            title: "Formulario",
            questions: []
        };

        for (
            let i = 0;
            i < 3;
            i++
        ) {

            state.currentPanel.form.questions.push({
                label: `Pregunta ${i + 1}`,
                required: true
            });
        }

        showNotification(
            "Formulario creado correctamente.",
            "success"
        );
    }

    $("#create-form")
        ?.addEventListener(
            "click",
            createForm
        );

    /* =====================================================
       GUARDAR PANEL
       ===================================================== */

    async function savePanel() {

        if (!state.selectedGuild) {

            showNotification(
                "Selecciona un servidor primero.",
                "error"
            );

            return;
        }

        if (!state.currentPanel) return;

        const title =
            $("#panel-title")?.value.trim();

        const description =
            $("#panel-description")?.value.trim();

        if (!title) {

            showNotification(
                "El título del panel es obligatorio.",
                "error"
            );

            return;
        }

        state.currentPanel.title =
            title;

        state.currentPanel.description =
            description || "";

        state.currentPanel.color =
            $("#panel-color")?.value ||
            "#5865F2";

        state.currentPanel.image =
            $("#panel-image")?.value.trim() ||
            "";

        state.currentPanel.thumbnail =
            $("#panel-thumbnail")?.value.trim() ||
            "";

        state.currentPanel.footer =
            $("#panel-footer")?.value.trim() ||
            "NR TICKET";

        state.currentPanel.timestamp =
            $("#panel-timestamp")?.checked !== false;

        try {

            const method =
                state.currentPanel.id
                    ? "PUT"
                    : "POST";

            const url =
                state.currentPanel.id
                    ? `${API}/guilds/${state.selectedGuild.id}/panels/${state.currentPanel.id}`
                    : `${API}/guilds/${state.selectedGuild.id}/panels`;

            await request(url, {
                method,
                body: JSON.stringify(
                    state.currentPanel
                )
            });

            showNotification(
                state.currentPanel.id
                    ? "Panel actualizado correctamente."
                    : "Panel creado correctamente.",
                "success"
            );

            closePanelEditor();

            await loadGuildData(
                state.selectedGuild.id
            );

        } catch {
            // La función request ya muestra el error.
        }
    }

    $("#save-panel")
        ?.addEventListener(
            "click",
            savePanel
        );

    /* =====================================================
       ELIMINAR PANEL
       ===================================================== */

    async function deletePanel(panelId) {

        if (!state.selectedGuild) return;

        const confirmed =
            window.confirm(
                "¿Seguro que quieres eliminar este panel?"
            );

        if (!confirmed) return;

        try {

            await request(
                `${API}/guilds/${state.selectedGuild.id}/panels/${panelId}`,
                {
                    method: "DELETE"
                }
            );

            showNotification(
                "Panel eliminado correctamente.",
                "success"
            );

            await loadGuildData(
                state.selectedGuild.id
            );

        } catch {
            // Error mostrado por request().
        }
    }

    /* =====================================================
       CONFIGURACIÓN DEL SERVIDOR
       ===================================================== */

    async function saveServerSettings() {

        if (!state.selectedGuild) {

            showNotification(
                "Selecciona un servidor primero.",
                "error"
            );

            return;
        }

        const settings = {};

        $$("[data-setting]").forEach(element => {

            const key =
                element.dataset.setting;

            if (element.type === "checkbox") {
                settings[key] =
                    element.checked;
            } else {
                settings[key] =
                    element.value;
            }
        });

        try {

            await request(
                `${API}/guilds/${state.selectedGuild.id}/settings`,
                {
                    method: "PUT",
                    body: JSON.stringify(settings)
                }
            );

            showNotification(
                "Configuración guardada.",
                "success"
            );

        } catch {
            // Error manejado por request().
        }
    }

    $("#save-settings")
        ?.addEventListener(
            "click",
            saveServerSettings
        );

    /* =====================================================
       MODALES
       ===================================================== */

    $$("[data-close-modal]").forEach(button => {

        button.addEventListener("click", () => {

            const modalId =
                button.dataset.closeModal;

            const modal =
                document.getElementById(modalId);

            modal?.classList.remove("active");
        });
    });

    $("#close-panel-editor")
        ?.addEventListener(
            "click",
            closePanelEditor
        );

    /* =====================================================
       INPUTS DEL EDITOR
       ===================================================== */

    [
        "panel-title",
        "panel-description",
        "panel-color",
        "panel-image",
        "panel-thumbnail",
        "panel-footer",
        "panel-timestamp"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (!element) return;

        element.addEventListener(
            "input",
            () => {

                if (!state.currentPanel) return;

                updatePreview();
            }
        );

        element.addEventListener(
            "change",
            () => {

                if (!state.currentPanel) return;

                updatePreview();
            }
        );
    });

    /* =====================================================
       BUSCADOR
       ===================================================== */

    const search =
        $("#guild-search");

    if (search) {

        search.addEventListener(
            "input",
            () => {

                const value =
                    search.value
                        .toLowerCase()
                        .trim();

                $$(".guild-card").forEach(card => {

                    const text =
                        card.textContent
                            .toLowerCase();

                    card.style.display =
                        text.includes(value)
                            ? ""
                            : "none";
                });
            }
        );
    }

    /* =====================================================
       REFRESCAR
       ===================================================== */

    $("#refresh-dashboard")
        ?.addEventListener(
            "click",
            async () => {

                await loadGuilds();

                if (state.selectedGuild) {

                    await loadGuildData(
                        state.selectedGuild.id
                    );
                }

                showNotification(
                    "Dashboard actualizado.",
                    "success"
                );
            }
        );

    /* =====================================================
       CREAR PANEL DESDE BOTÓN
       ===================================================== */

    $$("[data-create-panel]").forEach(button => {

        button.addEventListener(
            "click",
            openCreatePanel
        );
    });

    /* =====================================================
       LOGOUT
       ===================================================== */

    $("#logout")
        ?.addEventListener(
            "click",
            async () => {

                try {

                    await request(
                        "/auth/logout",
                        {
                            method: "POST"
                        }
                    );

                } finally {

                    window.location.href = "/";
                }
            }
        );

    /* =====================================================
       SERVIDOR GUARDADO
       ===================================================== */

    function restoreGuild() {

        const saved =
            localStorage.getItem(
                "nr_ticket_selected_guild"
            );

        if (!saved) return;

        const guild =
            state.guilds.find(
                g => String(g.id) === String(saved)
            );

        if (!guild) return;

        if (
            guild.manageable === false ||
            guild.canManage === false
        ) {
            return;
        }

        state.selectedGuild = guild;

        updateGuildUI();

        loadGuildData(guild.id);
    }

    /* =====================================================
       INICIO
       ===================================================== */

    async function init() {

        console.log(
            "%cNR TICKET",
            "font-size:22px;font-weight:bold;"
        );

        console.log(
            "Dashboard iniciado correctamente."
        );

        await loadUser();

        await loadGuilds();

        restoreGuild();

        showSection("home");
    }

    init();

});
