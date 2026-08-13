const { PermissionFlagsBits } = require("discord.js");

/*
|--------------------------------------------------------------------------

Comprobar administrador
*/

function isAdministrator(guild) {
if (!guild) return false;

if (guild.owner === true) {
    return true;
}

const permissions = BigInt(
    guild.permissions || "0"
);

return (
    (permissions & PermissionFlagsBits.Administrator) ===
    PermissionFlagsBits.Administrator
);

}

/*
|--------------------------------------------------------------------------

Comprobar Manage Guild
*/

function canManageGuild(guild) {
if (!guild) return false;

if (guild.owner === true) {
    return true;
}

const permissions = BigInt(
    guild.permissions || "0"
);

return (
    (permissions & PermissionFlagsBits.Administrator) ===
    PermissionFlagsBits.Administrator ||
    (permissions & PermissionFlagsBits.ManageGuild) ===
    PermissionFlagsBits.ManageGuild
);

}

/*
|--------------------------------------------------------------------------

Comprobar permisos específicos
*/

function hasPermission(guild, permission) {
if (!guild || !permission) {
return false;
}

if (guild.owner === true) {
    return true;
}

const permissions = BigInt(
    guild.permissions || "0"
);

const requiredPermission =
    PermissionFlagsBits[permission];

if (!requiredPermission) {
    return false;
}

return (
    (permissions & requiredPermission) ===
    requiredPermission
);

}

/*
|--------------------------------------------------------------------------

Comprobar acceso al servidor
*/

function canAccessGuild(guild) {
if (!guild) {
return false;
}

return (
    guild.owner === true ||
    canManageGuild(guild)
);

}

/*
|--------------------------------------------------------------------------

Permisos del sistema de tickets
*/

function canManageTickets(guild) {
return canManageGuild(guild);
}

/*
|--------------------------------------------------------------------------

Permisos de paneles
*/

function canManagePanels(guild) {
return canManageGuild(guild);
}

/*
|--------------------------------------------------------------------------

Permisos de formularios
*/

function canManageForms(guild) {
return canManageGuild(guild);
}

/*
|--------------------------------------------------------------------------

Permisos de logs
*/

function canManageLogs(guild) {
return canManageGuild(guild);
}

/*
|--------------------------------------------------------------------------

Verificar rol autorizado
*/

function hasAuthorizedRole(member, roleIds = []) {
if (!member || !Array.isArray(roleIds)) {
return false;
}

if (!roleIds.length) {
    return false;
}

return roleIds.some(roleId =>
    member.roles?.cache?.has(roleId)
);

}

/*
|--------------------------------------------------------------------------

Comprobar si puede aceptar formulario
*/

function canAcceptForm(member, roleIds = []) {
return hasAuthorizedRole(
member,
roleIds
);
}

/*
|--------------------------------------------------------------------------

Comprobar si puede rechazar formulario
*/

function canRejectForm(member, roleIds = []) {
return hasAuthorizedRole(
member,
roleIds
);
}

/*
|--------------------------------------------------------------------------

Exportar
*/

module.exports = {
isAdministrator,
canManageGuild,
hasPermission,
canAccessGuild,
canManageTickets,
canManagePanels,
canManageForms,
canManageLogs,
hasAuthorizedRole,
canAcceptForm,
canRejectForm
};
