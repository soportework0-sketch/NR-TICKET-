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

LISTAR FORMULARIOS
*/

router.get("/:guildId", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!canManage(guild)) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para administrar formularios."
    });
}

res.json({
    success: true,
    forms: []
});

});

/*
|--------------------------------------------------------------------------

CREAR FORMULARIO
*/

router.post("/:guildId/create", requireAuth, (req, res) => {
const guild = getGuild(req);

if (!canManage(guild)) {
    return res.status(403).json({
        success: false,
        message: "No tienes permisos para crear formularios."
    });
}

const {
    name,
    description,
    questions,
    publishChannelId,
    responsesChannelId,
    acceptRoles,
    rejectRoles
} = req.body;

if (!name) {
    return res.status(400).json({
        success: false,
        message: "El nombre del formulario es obligatorio."
    });
}

if (!Array.isArray(questions)) {
    return res.status(400).json({
        success: false,
        message: "Las preguntas deben ser una lista."
    });
}

if (questions.length > 12) {
    return res.status(400).json({
        success: false,
        message: "Un formulario puede tener máximo 12 preguntas."
    });
}

const form = {
    id: `form_${Date.now()}`,

    guildId: guild.id,

    name,

    description:
        description ||
        "Completa el siguiente formulario.",

    questions: questions.map((question, index) => ({
        id: question.id || `question_${index + 1}`,
        number: index + 1,
        title: question.title || `Pregunta ${index + 1}`,
        description: question.description || null,
        required: question.required !== false,
        type: question.type || "text"
    })),

    publishChannelId:
        publishChannelId || null,

    responsesChannelId:
        responsesChannelId || null,

    acceptRoles:
        Array.isArray(acceptRoles)
            ? acceptRoles
            : [],

    rejectRoles:
        Array.isArray(rejectRoles)
            ? rejectRoles
            : [],

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString()
};

res.status(201).json({
    success: true,
    message: "Formulario creado correctamente.",
    form
});

});

/*
|--------------------------------------------------------------------------

OBTENER FORMULARIO
*/

router.get(
"/:guildId/:formId",
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
        form: {
            id: req.params.formId,
            guildId: req.params.guildId,
            name: "Formulario",
            questions: []
        }
    });
}

);

/*
|--------------------------------------------------------------------------

EDITAR FORMULARIO
*/

router.put(
"/:guildId/:formId",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para editar formularios."
        });
    }

    if (
        req.body.questions &&
        req.body.questions.length > 12
    ) {
        return res.status(400).json({
            success: false,
            message: "Un formulario puede tener máximo 12 preguntas."
        });
    }

    res.json({
        success: true,
        message: "Formulario actualizado correctamente.",
        formId: req.params.formId,
        changes: req.body,
        updatedAt: new Date().toISOString()
    });
}

);

/*
|--------------------------------------------------------------------------

ELIMINAR FORMULARIO
*/

router.delete(
"/:guildId/:formId",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para eliminar formularios."
        });
    }

    res.json({
        success: true,
        message: "Formulario eliminado correctamente.",
        formId: req.params.formId
    });
}

);

/*
|--------------------------------------------------------------------------

ENVIAR RESPUESTA
*/

router.post(
"/:guildId/:formId/submit",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!guild) {
        return res.status(403).json({
            success: false,
            message: "Servidor no autorizado."
        });
    }

    const { answers } = req.body;

    if (!answers || typeof answers !== "object") {
        return res.status(400).json({
            success: false,
            message: "Debes completar el formulario."
        });
    }

    const submission = {
        id: `submission_${Date.now()}`,
        formId: req.params.formId,
        guildId: guild.id,
        userId: req.session.user.id,
        answers,
        status: "pending",
        reviewedBy: null,
        rejectionReason: null,
        createdAt: new Date().toISOString()
    };

    res.status(201).json({
        success: true,
        message: "Formulario enviado correctamente.",
        submission
    });
}

);

/*
|--------------------------------------------------------------------------

ACEPTAR SOLICITUD
*/

router.post(
"/:guildId/:formId/:submissionId/accept",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para aceptar solicitudes."
        });
    }

    res.json({
        success: true,
        message: "Solicitud aceptada correctamente.",
        submission: {
            id: req.params.submissionId,
            status: "accepted",
            reviewedBy: req.session.user.id,
            reviewedAt: new Date().toISOString()
        }
    });
}

);

/*
|--------------------------------------------------------------------------

RECHAZAR SOLICITUD
*/

router.post(
"/:guildId/:formId/:submissionId/reject",
requireAuth,
(req, res) => {
const guild = getGuild(req);

    if (!canManage(guild)) {
        return res.status(403).json({
            success: false,
            message: "No tienes permisos para rechazar solicitudes."
        });
    }

    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({
            success: false,
            message: "Debes indicar un motivo de rechazo."
        });
    }

    res.json({
        success: true,
        message: "Solicitud rechazada correctamente.",
        submission: {
            id: req.params.submissionId,
            status: "rejected",
            rejectionReason: reason,
            reviewedBy: req.session.user.id,
            reviewedAt: new Date().toISOString()
        }
    });
}

);

module.exports = router;
