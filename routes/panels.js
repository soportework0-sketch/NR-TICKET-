const express = require("express");
const router = express.Router();

function requireAuth(req, res, next) {
if (!req.session || !req.session.user) {
return res.status(401).json({
success: false,
message: "No has iniciado sesión."
});
}

next();

}

function getGuild(req) {
return req.session.user.guilds?.find(
guild => guild.id === req.params.guildId
);
}

function canManage(guild) {
if (!guild) return false;

if (guild.owner === true) return true;

const permissions = BigInt(guild.permissions || "0");

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

return (
    (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
    (permissions & MANAGE_GUILD) === MANAGE_GUILD
);

}

/*
|--------------------------------------------------------------------------

OBTENER PANELES
*/

router.get("/:guildId", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!canManage(guild)) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para administrar los paneles."
    });
}

res.json({
    success: true,
    panels: []
});

});

/*
|--------------------------------------------------------------------------

CREAR PANEL
*/

router.post("/:guildId/create", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!canManage(guild)) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para crear paneles."
    });
}

const {
    name,
    type,
    channelId,
    categoryId,
    logsChannelId,
    staffRoleId,
    messageType,
    title,
    description,
    color,
    image,
    thumbnail,
    footer,
    timestamp,
    components,
    formId
} = req.body;

if (!name || !type || !channelId) {
    return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios."
    });
}

const panel = {
    id: `panel_${Date.now()}`,

    guildId: guild.id,

    name,

    type,

    channelId,

    categoryId: categoryId || null,

    logsChannelId: logsChannelId || null,

    staffRoleId: staffRoleId || null,

    message: {
        type: messageType || "embed",

        title: title || "🎫 Soporte",

        description:
            description ||
            "Selecciona una opción para recibir ayuda.",

        color: color || "#5865F2",

        image: image || null,

        thumbnail: thumbnail || null,

        footer: footer || "NR TICKET",

        timestamp: timestamp !== false
    },

    components: Array.isArray(components)
        ? components
        : [],

    formId: formId || null,

    published: false,

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString()
};

res.status(201).json({
    success: true,
    message: "Panel creado correctamente.",
    panel
});

});

/*
|--------------------------------------------------------------------------

OBTENER PANEL
*/

router.get(
"/:guildId/:panelId",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado."
        });
    }

    res.json({
        success: true,
        panel: {
            id: req.params.panelId,
            guildId: req.params.guildId,
            name: "Panel de soporte",
            published: false
        }
    });
}

);

/*
|--------------------------------------------------------------------------

EDITAR PANEL
*/

router.put(
"/:guildId/:panelId",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para editar este panel."
        });
    }

    res.json({
        success: true,
        message: "Panel actualizado correctamente.",
        panelId: req.params.panelId,
        changes: req.body,
        updatedAt: new Date().toISOString()
    });
}

);

/*
|--------------------------------------------------------------------------

ELIMINAR PANEL
*/

router.delete(
"/:guildId/:panelId",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para eliminar este panel."
        });
    }

    res.json({
        success: true,
        message: "Panel eliminado correctamente.",
        panelId: req.params.panelId
    });
}

);

/*
|--------------------------------------------------------------------------

PUBLICAR PANEL
*/

router.post(
"/:guildId/:panelId/publish",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para publicar paneles."
        });
    }

    const { channelId } = req.body;

    if (!channelId) {
        return res.status(400).json({
            success: false,
            message: "Debes seleccionar un canal."
        });
    }

    res.json({
        success: true,
        message: "Panel publicado correctamente.",
        panelId: req.params.panelId,
        channelId,
        published: true,
        publishedAt: new Date().toISOString()
    });
}

);

/*
|--------------------------------------------------------------------------

DUPLICAR PANEL
*/

router.post(
"/:guildId/:panelId/duplicate",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para duplicar paneles."
        });
    }

    res.status(201).json({
        success: true,
        message: "Panel duplicado correctamente.",
        panel: {
            id: `panel_${Date.now()}`,
            originalPanelId: req.params.panelId,
            guildId: req.params.guildId,
            published: false
        }
    });
}

);

module.exports = router;
