const {
Client,
GatewayIntentBits,
ChannelType,
PermissionFlagsBits
} = require("discord.js");

/*
|--------------------------------------------------------------------------

Cliente de Discord
*/

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

/*
|--------------------------------------------------------------------------

Obtener servidor
*/

function getGuild(guildId) {
return client.guilds.cache.get(guildId) || null;
}

/*
|--------------------------------------------------------------------------

Obtener canal
*/

function getChannel(guildId, channelId) {
const guild = getGuild(guildId);

if (!guild) return null;

return guild.channels.cache.get(channelId) || null;

}

/*
|--------------------------------------------------------------------------

Obtener rol
*/

function getRole(guildId, roleId) {
const guild = getGuild(guildId);

if (!guild) return null;

return guild.roles.cache.get(roleId) || null;

}

/*
|--------------------------------------------------------------------------

Obtener canales
*/

function getChannels(guildId) {
const guild = getGuild(guildId);

if (!guild) return [];

return guild.channels.cache.map(channel => ({
    id: channel.id,
    name: channel.name,
    type: channel.type
}));

}

/*
|--------------------------------------------------------------------------

Obtener roles
*/

function getRoles(guildId) {
const guild = getGuild(guildId);

if (!guild) return [];

return guild.roles.cache
    .filter(role => !role.managed)
    .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position
    }));

}

/*
|--------------------------------------------------------------------------

Enviar mensaje
*/

async function sendMessage(channelId, content, options = {}) {
const channel = client.channels.cache.get(channelId);

if (!channel || !channel.isTextBased()) {
    throw new Error("Canal no encontrado o no es un canal de texto.");
}

return channel.send({
    content,
    ...options
});

}

/*
|--------------------------------------------------------------------------

Crear canal privado
*/

async function createPrivateTicketChannel(
guildId,
channelName,
userId,
staffRoleId,
categoryId = null
) {
const guild = getGuild(guildId);

if (!guild) {
    throw new Error("Servidor no encontrado.");
}

const permissionOverwrites = [
    {
        id: guild.roles.everyone.id,
        deny: [
            PermissionFlagsBits.ViewChannel
        ]
    },
    {
        id: userId,
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
        ]
    }
];

if (staffRoleId) {
    permissionOverwrites.push({
        id: staffRoleId,
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
        ]
    });
}

return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || null,
    permissionOverwrites
});

}

/*
|--------------------------------------------------------------------------

Crear hilo privado
*/

async function createPrivateThread(
channelId,
threadName
) {
const channel = client.channels.cache.get(channelId);

if (!channel || !channel.isTextBased()) {
    throw new Error("Canal no encontrado.");
}

return channel.threads.create({
    name: threadName,
    type: ChannelType.PrivateThread,
    invitable: false
});

}

/*
|--------------------------------------------------------------------------

Crear canal de voz privado
*/

async function createVoiceChannel(
guildId,
channelName,
userId,
staffRoleId,
categoryId = null
) {
const guild = getGuild(guildId);

if (!guild) {
    throw new Error("Servidor no encontrado.");
}

const permissionOverwrites = [
    {
        id: guild.roles.everyone.id,
        deny: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect
        ]
    },
    {
        id: userId,
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect
        ]
    }
];

if (staffRoleId) {
    permissionOverwrites.push({
        id: staffRoleId,
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect
        ]
    });
}

return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: categoryId || null,
    permissionOverwrites
});

}

/*
|--------------------------------------------------------------------------

Eliminar canal
*/

async function deleteChannel(channelId) {
const channel = client.channels.cache.get(channelId);

if (!channel) {
    return false;
}

await channel.delete();

return true;

}

/*
|--------------------------------------------------------------------------

Login del bot
*/

async function loginBot() {
if (!process.env.DISCORD_TOKEN) {
throw new Error(
"DISCORD_TOKEN no está configurado."
);
}

await client.login(
    process.env.DISCORD_TOKEN
);

}

/*
|--------------------------------------------------------------------------

Exportar
*/

module.exports = {
client,
getGuild,
getChannel,
getRole,
getChannels,
getRoles,
sendMessage,
createPrivateTicketChannel,
createPrivateThread,
createVoiceChannel,
deleteChannel,
loginBot
};
