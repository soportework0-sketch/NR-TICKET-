const express = require("express");
const router = express.Router();

/*
|--------------------------------------------------------------------------

Middleware de autenticación
*/

function requireAuth(req, res, next) {
if (!req.session || !req.session.user) {
return res.status(401).json({
success: false,
message: "No has iniciado sesión."
});
}

next();

}

/*
|--------------------------------------------------------------------------

Dashboard principal
*/

router.get("/", requireAuth, (req, res) => {
res.json({
success: true,
user: req.session.user,
message: "Dashboard de NR TICKET"
});
});

/*
|--------------------------------------------------------------------------

Usuario actual
*/

router.get("/me", requireAuth, (req, res) => {
res.json({
success: true,
user: req.session.user
});
});

/*
|--------------------------------------------------------------------------

Servidores del usuario
*/

router.get("/servers", requireAuth, async (req, res) => {
try {
if (!req.session.user.guilds) {
return res.json({
success: true,
servers: []
});
}

    const servers = req.session.user.guilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
            : null,
        owner: guild.owner || false,
        permissions: guild.permissions || "0"
    }));

    res.json({
        success: true,
        servers
    });
} catch (error) {
    console.error("Error obteniendo servidores:", error);

    res.status(500).json({
        success: false,
        message: "No se pudieron obtener los servidores."
    });
}

});

/*
|--------------------------------------------------------------------------

Comprobar acceso a un servidor
*/

router.get("/servers/:guildId/access", requireAuth, (req, res) => {
const { guildId } = req.params;

const guild = req.session.user.guilds?.find(
    server => server.id === guildId
);

if (!guild) {
    return res.status(403).json({
        success: false,
        access: false,
        message: "No tienes acceso a este servidor."
    });
}

res.json({
    success: true,
    access: true,
    server: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
            : null,
        owner: guild.owner || false,
        permissions: guild.permissions || "0"
    }
});

});

/*
|--------------------------------------------------------------------------

Configuración de servidor
*/

router.get("/servers/:guildId/config", requireAuth, (req, res) => {
const { guildId } = req.params;

const guild = req.session.user.guilds?.find(
    server => server.id === guildId
);

if (!guild) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para administrar este servidor."
    });
}

res.json({
    success: true,
    guildId,
    config: {
        tickets: true,
        logs: false,
        notifications: false,
        seismicAlerts: false
    }
});

});

/*
|--------------------------------------------------------------------------

Guardar configuración
*/

router.post("/servers/:guildId/config", requireAuth, (req, res) => {
const { guildId } = req.params;
const config = req.body;

const guild = req.session.user.guilds?.find(
    server => server.id === guildId
);

if (!guild) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para modificar este servidor."
    });
}

res.json({
    success: true,
    message: "Configuración guardada correctamente.",
    guildId,
    config
});

});

/*
|--------------------------------------------------------------------------

Estadísticas
*/

router.get("/servers/:guildId/statistics", requireAuth, (req, res) => {
const { guildId } = req.params;

const guild = req.session.user.guilds?.find(
    server => server.id === guildId
);

if (!guild) {
    return res.status(403).json({
        success: false,
        message: "Acceso denegado."
    });
}

res.json({
    success: true,
    statistics: {
        ticketsCreated: 0,
        ticketsOpen: 0,
        ticketsClosed: 0,
        formsReceived: 0,
        formsAccepted: 0,
        formsRejected: 0
    }
});

});

/*
|--------------------------------------------------------------------------

Exportar router
*/

module.exports = router;
