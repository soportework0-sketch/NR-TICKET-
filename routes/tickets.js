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
const guildId = req.params.guildId;

return req.session.user.guilds?.find(
    guild => guild.id === guildId
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

LISTAR TICKETS
*/

router.get("/:guildId", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!canManage(guild)) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para administrar los tickets."
    });
}

res.json({
    success: true,
    tickets: []
});

});

/*
|--------------------------------------------------------------------------

CREAR TICKET
*/

router.post("/:guildId/create", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!guild) {
    return res.status(403).json({
        success: false,
        message: "Servidor no autorizado."
    });
}

const {
    type,
    category,
    panelId,
    userId
} = req.body;

if (!type || !category) {
    return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios."
    });
}

const ticket = {
    id: `ticket_${Date.now()}`,
    guildId: guild.id,
    userId: userId || req.session.user.id,
    type,
    category,
    panelId: panelId || null,
    status: "open",
    claimedBy: null,
    createdAt: new Date().toISOString(),
    closedAt: null,
    closedBy: null
};

res.status(201).json({
    success: true,
    message: "Ticket creado correctamente.",
    ticket
});

});

/*
|--------------------------------------------------------------------------

VER TICKET
*/

router.get("/:guildId/:ticketId", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!canManage(guild)) {
    return res.status(403).json({
        success: false,
        message: "Acceso denegado."
    });
}

res.json({
    success: true,
    ticket: {
        id: req.params.ticketId,
        guildId: req.params.guildId,
        status: "open",
        claimedBy: null
    }
});

});

/*
|--------------------------------------------------------------------------

RECLAMAR TICKET
*/

router.post(
"/:guildId/:ticketId/claim",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para reclamar tickets."
        });
    }

    res.json({
        success: true,
        message: "Ticket reclamado correctamente.",
        ticket: {
            id: req.params.ticketId,
            status: "claimed",
            claimedBy: req.session.user.id
        }
    });
}

);

/*
|--------------------------------------------------------------------------

CERRAR TICKET
*/

router.post(
"/:guildId/:ticketId/close",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para cerrar tickets."
        });
    }

    res.json({
        success: true,
        message: "Ticket cerrado correctamente.",
        ticket: {
            id: req.params.ticketId,
            status: "closed",
            closedBy: req.session.user.id,
            closedAt: new Date().toISOString()
        }
    });
}

);

/*
|--------------------------------------------------------------------------

AÑADIR USUARIO
*/

router.post(
"/:guildId/:ticketId/add",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para modificar este ticket."
        });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "Debes indicar el ID del usuario."
        });
    }

    res.json({
        success: true,
        message: "Usuario añadido al ticket.",
        userId
    });
}

);

/*
|--------------------------------------------------------------------------

REMOVER USUARIO
*/

router.post(
"/:guildId/:ticketId/remove",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para modificar este ticket."
        });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "Debes indicar el ID del usuario."
        });
    }

    res.json({
        success: true,
        message: "Usuario eliminado del ticket.",
        userId
    });
}

);

/*
|--------------------------------------------------------------------------

RENOMBRAR TICKET
*/

router.post(
"/:guildId/:ticketId/rename",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para renombrar tickets."
        });
    }

    const { name } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Debes indicar un nombre."
        });
    }

    res.json({
        success: true,
        message: "Ticket renombrado correctamente.",
        name
    });
}

);

module.exports = router;
