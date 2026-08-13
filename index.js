require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    Partials,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

/* =========================================================
   NR TICKET
   CORE COMPLETO
   VERSION MULTIIDIOMA
   ========================================================= */

const app = express();

const PORT =
    Number(process.env.PORT) || 3000;

const PREFIX = "=";

const ROOT =
    __dirname;

const DATABASE_DIR =
    path.join(ROOT, "database");

const DASHBOARD_DIR =
    path.join(ROOT, "dashboard");

const LOCALES_DIR =
    path.join(ROOT, "locales");

const PUBLIC_DIR =
    path.join(ROOT, "public");

/* =========================================================
   URL DEL DASHBOARD
   ========================================================= */

const DASHBOARD_URL =
    process.env.DASHBOARD_URL ||
    "https://sn-soporte.onrender.com";

const SUPPORT_SERVER_URL =
    process.env.SUPPORT_SERVER_URL ||
    process.env.SUPPORT_SERVER_INVITE ||
    "https://discord.gg/TU_SERVIDOR";

/* =========================================================
   CLIENT DISCORD
   ========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

/* =========================================================
   IDIOMAS
   ========================================================= */

const LANGUAGES = [
    "es",
    "en",
    "pt",
    "fr",
    "de",
    "it"
];

const DEFAULT_LANGUAGE = "es";

const LANGUAGE_NAMES = {
    es: "🇪🇸 Español",
    en: "🇺🇸 English",
    pt: "🇧🇷 Português",
    fr: "🇫🇷 Français",
    de: "🇩🇪 Deutsch",
    it: "🇮🇹 Italiano"
};

const translations = {};

const FALLBACK_TRANSLATIONS = {

    ticket_created:
        "🎫 Tu ticket ha sido creado correctamente.",

    ticket_closed:
        "🔒 Este ticket ha sido cerrado.",

    ticket_claimed:
        "🛠️ Este ticket ha sido reclamado por {user}.",

    no_permission:
        "❌ No tienes permisos para realizar esta acción.",

    language_changed:
        "🌐 Idioma cambiado correctamente.",

    not_authenticated:
        "🔐 Debes iniciar sesión.",

    route_not_found:
        "❌ Ruta no encontrada.",

    internal_error:
        "❌ Ocurrió un error interno.",

    guild_not_found:
        "❌ Servidor no encontrado.",

    guild_access_denied:
        "❌ No tienes acceso a este servidor.",

    invalid_language:
        "❌ Idioma no válido.",

    logout_success:
        "✅ Sesión cerrada correctamente.",

    logout_error:
        "❌ No se pudo cerrar la sesión."
};

/* =========================================================
   DATABASE
   ========================================================= */

const DEFAULT_DATABASE = {

    "config.json": {},

    "servers.json": {},

    "users.json": {},

    "panels.json": [],

    "tickets.json": [],

    "forms.json": {},

    "logs.json": [],

    "incidents.json": [],

    "statistics.json": {},

    "notifications.json": []
};

function ensureDirectories() {

    const directories = [
        DATABASE_DIR,
        DASHBOARD_DIR,
        LOCALES_DIR,
        PUBLIC_DIR
    ];

    for (
        const directory of directories
    ) {

        if (
            !fs.existsSync(directory)
        ) {

            fs.mkdirSync(
                directory,
                {
                    recursive: true
                }
            );
        }
    }
}

function ensureDatabase() {

    ensureDirectories();

    for (
        const [
            file,
            defaultData
        ] of Object.entries(
            DEFAULT_DATABASE
        )
    ) {

        const filePath =
            path.join(
                DATABASE_DIR,
                file
            );

        if (
            !fs.existsSync(
                filePath
            )
        ) {

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    defaultData,
                    null,
                    4
                ),
                "utf8"
            );
        }
    }
}

function readJSON(
    file,
    fallback = null
) {

    const filePath =
        path.join(
            DATABASE_DIR,
            file
        );

    try {

        if (
            !fs.existsSync(
                filePath
            )
        ) {
            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(
                filePath,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            `[DATABASE] ${file}`,
            error.message
        );

        return fallback;
    }
}

function writeJSON(
    file,
    data
) {

    const filePath =
        path.join(
            DATABASE_DIR,
            file
        );

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            4
        ),
        "utf8"
    );
}

ensureDatabase();

/* =========================================================
   LOCALES
   ========================================================= */

function loadLocales() {

    for (
        const language of
        LANGUAGES
    ) {

        const file =
            path.join(
                LOCALES_DIR,
                `${language}.json`
            );

        if (
            !fs.existsSync(
                file
            )
        ) {

            translations[
                language
            ] = {};

            continue;
        }

        try {

            translations[
                language
            ] =
                JSON.parse(
                    fs.readFileSync(
                        file,
                        "utf8"
                    )
                );

        } catch (
            error
        ) {

            console.warn(
                `[LOCALE] No se pudo cargar ${language}.json`
            );

            translations[
                language
            ] = {};
        }
    }
}

loadLocales();

function translate(
    language,
    key,
    variables = {}
) {

    const lang =
        LANGUAGES.includes(
            language
        )
            ? language
            : DEFAULT_LANGUAGE;

    let text =
        translations[lang]?.[key] ??
        translations[
            DEFAULT_LANGUAGE
        ]?.[key] ??
        FALLBACK_TRANSLATIONS[
            key
        ] ??
        key;

    for (
        const [
            name,
            value
        ] of Object.entries(
            variables
        )
    ) {

        text =
            text.replace(
                new RegExp(
                    `\\{${name}\\}`,
                    "g"
                ),
                String(value)
            );
    }

    return text;
}

/* =========================================================
   CONFIG SERVER
   ========================================================= */

function getServerConfig(
    guildId
) {

    const servers =
        readJSON(
            "servers.json",
            {}
        );

    if (
        !servers[guildId]
    ) {

        servers[guildId] = {

            guildId,

            language:
                DEFAULT_LANGUAGE,

            ticket: {

                enabled:
                    true,

                categoryId:
                    null,

                staffRoleId:
                    null,

                logsChannelId:
                    null,

                transcriptChannelId:
                    null
            },

            panel: {

                channelId:
                    null,

                messageId:
                    null
            },

            forms: [],

            createdAt:
                new Date().toISOString()
        };

        writeJSON(
            "servers.json",
            servers
        );
    }

    return servers[guildId];
}

function saveServerConfig(
    guildId,
    config
) {

    const servers =
        readJSON(
            "servers.json",
            {}
        );

    servers[guildId] =
        config;

    writeJSON(
        "servers.json",
        servers
    );
}

function guildLanguage(
    guildId
) {

    const config =
        getServerConfig(
            guildId
        );

    return (
        config.language ||
        DEFAULT_LANGUAGE
    );
}

/* =========================================================
   ESTADÍSTICAS
   ========================================================= */

function getStatistics(
    guildId
) {

    const statistics =
        readJSON(
            "statistics.json",
            {}
        );

    if (
        !statistics[guildId]
    ) {

        statistics[guildId] = {

            ticketsCreated:
                0,

            ticketsClosed:
                0,

            ticketsClaimed:
                0,

            formsCreated:
                0,

            formsSubmitted:
                0,

            formsAccepted:
                0,

            formsRejected:
                0
        };

        writeJSON(
            "statistics.json",
            statistics
        );
    }

    return statistics[guildId];
}

function incrementStatistic(
    guildId,
    key
) {

    const statistics =
        readJSON(
            "statistics.json",
            {}
        );

    if (
        !statistics[guildId]
    ) {

        statistics[guildId] =
            getStatistics(
                guildId
            );
    }

    statistics[guildId][key] =
        Number(
            statistics[guildId][key] ||
            0
        ) + 1;

    writeJSON(
        "statistics.json",
        statistics
    );
}

/* =========================================================
   LOGS
   ========================================================= */

async function createLog(
    guild,
    type,
    data = {}
) {

    const logs =
        readJSON(
            "logs.json",
            []
        );

    logs.push({

        id:
            `log_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`,

        guildId:
            guild.id,

        type,

        data,

        createdAt:
            new Date().toISOString()
    });

    writeJSON(
        "logs.json",
        logs
    );

    const config =
        getServerConfig(
            guild.id
        );

    const channelId =
        config.ticket
            ?.logsChannelId;

    if (!channelId) {
        return;
    }

    const channel =
        guild.channels.cache.get(
            channelId
        );

    if (
        !channel ||
        !channel.isTextBased()
    ) {
        return;
    }

    const description =
        Object.entries(data)
            .map(
                ([key, value]) =>
                    `**${key}:** ${value}`
            )
            .join("\n")
            .slice(
                0,
                4000
            );

    const embed =
        new EmbedBuilder()
            .setTitle(
                `📋 NR TICKET • ${type}`
            )
            .setDescription(
                description ||
                "Sin información."
            )
            .setTimestamp();

    await channel.send({
        embeds: [
            embed
        ]
    }).catch(
        () => {}
    );
}

/* =========================================================
   TICKETS
   ========================================================= */

function getTickets() {

    return readJSON(
        "tickets.json",
        []
    );
}

function saveTickets(
    tickets
) {

    writeJSON(
        "tickets.json",
        tickets
    );
}

function generateTicketId() {

    return (
        "ticket_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(
                2,
                8
            )
    );
}

function findTicket(
    id
) {

    return getTickets().find(
        ticket =>
            ticket.id === id ||
            ticket.channelId === id
    );
}

function isStaff(
    member
) {

    if (!member) {
        return false;
    }

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    const config =
        getServerConfig(
            member.guild.id
        );

    return Boolean(
        config.ticket
            ?.staffRoleId &&
        member.roles.cache.has(
            config.ticket.staffRoleId
        )
    );
}

/* =========================================================
   CREAR TICKET
   ========================================================= */

async function createTicket({
    guild,
    user,
    category = "soporte",
    panelId = null
}) {

    const config =
        getServerConfig(
            guild.id
        );

    if (
        config.ticket.enabled ===
        false
    ) {

        throw new Error(
            "TICKET_SYSTEM_DISABLED"
        );
    }

    const existing =
        getTickets().find(
            ticket =>
                ticket.guildId ===
                    guild.id &&
                ticket.userId ===
                    user.id &&
                [
                    "open",
                    "claimed"
                ].includes(
                    ticket.status
                )
        );

    if (existing) {

        return guild.channels.cache.get(
            existing.channelId
        );
    }

    const ticketId =
        generateTicketId();

    const username =
        user.username
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            )
            .slice(
                0,
                18
            ) ||
        "usuario";

    const channel =
        await guild.channels.create({

            name:
                `ticket-${username}`,

            type:
                ChannelType.GuildText,

            parent:
                config.ticket
                    .categoryId ||
                null,

            permissionOverwrites: [

                {
                    id:
                        guild.roles
                            .everyone
                            .id,

                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                },

                {
                    id:
                        user.id,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },

                ...(config.ticket
                    .staffRoleId
                    ? [
                        {
                            id:
                                config.ticket
                                    .staffRoleId,

                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageMessages
                            ]
                        }
                    ]
                    : [])
            ]
        });

    const ticket = {

        id:
            ticketId,

        guildId:
            guild.id,

        channelId:
            channel.id,

        userId:
            user.id,

        category,

        panelId,

        status:
            "open",

        claimedBy:
            null,

        createdAt:
            new Date().toISOString(),

        closedAt:
            null,

        closedBy:
            null
    };

    const tickets =
        getTickets();

    tickets.push(
        ticket
    );

    saveTickets(
        tickets
    );

    incrementStatistic(
        guild.id,
        "ticketsCreated"
    );

    const language =
        guildLanguage(
            guild.id
        );

    const embed =
        new EmbedBuilder()

            .setTitle(
                "🎫 NR TICKET"
            )

            .setDescription(
                translate(
                    language,
                    "ticket_created"
                )
            )

            .addFields(

                {
                    name:
                        "👤 Usuario",

                    value:
                        `<@${user.id}>`,

                    inline:
                        true
                },

                {
                    name:
                        "📂 Categoría",

                    value:
                        category,

                    inline:
                        true
                },

                {
                    name:
                        "🆔 ID",

                    value:
                        `\`${ticketId}\``,

                    inline:
                        false
                }
            )

            .setTimestamp();

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `ticket_claim:${ticketId}`
                    )
                    .setLabel(
                        "Reclamar"
                    )
                    .setEmoji(
                        "🛠️"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `ticket_add:${ticketId}`
                    )
                    .setLabel(
                        "Añadir"
                    )
                    .setEmoji(
                        "➕"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `ticket_remove:${ticketId}`
                    )
                    .setLabel(
                        "Remover"
                    )
                    .setEmoji(
                        "➖"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `ticket_close:${ticketId}`
                    )
                    .setLabel(
                        "Cerrar"
                    )
                    .setEmoji(
                        "🔒"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    await channel.send({

        content:
            `<@${user.id}>`,

        embeds: [
            embed
        ],

        components: [
            row
        ]
    });

    await createLog(
        guild,
        "TICKET_CREATED",
        {
            Ticket:
                ticketId,

            Usuario:
                user.tag,

            Categoría:
                category
        }
    );

    return channel;
}

/* =========================================================
   RECLAMAR
   ========================================================= */

async function claimTicket(
    ticket,
    moderator
) {

    if (!ticket) {
        return false;
    }

    if (
        ticket.status ===
        "closed"
    ) {
        return false;
    }

    ticket.status =
        "claimed";

    ticket.claimedBy =
        moderator.id;

    const tickets =
        getTickets();

    const index =
        tickets.findIndex(
            item =>
                item.id ===
                ticket.id
        );

    if (
        index !== -1
    ) {

        tickets[index] =
            ticket;

        saveTickets(
            tickets
        );
    }

    incrementStatistic(
        moderator.guild.id,
        "ticketsClaimed"
    );

    const channel =
        moderator.guild.channels.cache.get(
            ticket.channelId
        );

    if (channel) {

        await channel.send({

            embeds: [

                new EmbedBuilder()
                    .setDescription(
                        `🛠️ Ticket reclamado por <@${moderator.id}>.`
                    )
                    .setTimestamp()
            ]

        }).catch(
            () => {}
        );
    }

    await createLog(
        moderator.guild,
        "TICKET_CLAIMED",
        {
            Ticket:
                ticket.id,

            Staff:
                moderator.user.tag
        }
    );

    return true;
}

/* =========================================================
   CERRAR
   ========================================================= */

async function closeTicket(
    ticket,
    moderator
) {

    if (!ticket) {
        return false;
    }

    if (
        ticket.status ===
        "closed"
    ) {
        return false;
    }

    ticket.status =
        "closed";

    ticket.closedAt =
        new Date().toISOString();

    ticket.closedBy =
        moderator.id;

    const tickets =
        getTickets();

    const index =
        tickets.findIndex(
            item =>
                item.id ===
                ticket.id
        );

    if (
        index !== -1
    ) {

        tickets[index] =
            ticket;

        saveTickets(
            tickets
        );
    }

    incrementStatistic(
        moderator.guild.id,
        "ticketsClosed"
    );

    const channel =
        moderator.guild.channels.cache.get(
            ticket.channelId
        );

    if (channel) {

        await channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle(
                        "🔒 Ticket cerrado"
                    )

                    .setDescription(
                        `Cerrado por <@${moderator.id}>.`
                    )

                    .setTimestamp()
            ]

        }).catch(
            () => {}
        );

        setTimeout(
            () => {

                channel.delete(
                    "NR TICKET • Ticket cerrado"
                ).catch(
                    () => {}
                );

            },
            5000
        );
    }

    await createLog(
        moderator.guild,
        "TICKET_CLOSED",
        {
            Ticket:
                ticket.id,

            Staff:
                moderator.user.tag
        }
    );

    return true;
}

/* =========================================================
   AÑADIR USUARIO
   ========================================================= */

async function addUserToTicket(
    ticket,
    guild,
    userId
) {

    const channel =
        guild.channels.cache.get(
            ticket.channelId
        );

    if (!channel) {
        return false;
    }

    await channel.permissionOverwrites.edit(
        userId,
        {
            ViewChannel:
                true,

            SendMessages:
                true,

            ReadMessageHistory:
                true,

            AttachFiles:
                true
        }
    );

    return true;
}

/* =========================================================
   REMOVER USUARIO
   ========================================================= */

async function removeUserFromTicket(
    ticket,
    guild,
    userId
) {

    const channel =
        guild.channels.cache.get(
            ticket.channelId
        );

    if (!channel) {
        return false;
    }

    await channel.permissionOverwrites.edit(
        userId,
        {
            ViewChannel:
                false
        }
    );

    return true;
}

/* =========================================================
   PANEL
   ========================================================= */

function buildTicketPanel(
    language = "es"
) {

    const isEnglish =
        language === "en";

    const embed =
        new EmbedBuilder()

            .setTitle(
                "🎫 NR TICKET"
            )

            .setDescription(
                isEnglish
                    ? "Select the type of support you need."
                    : "Selecciona el tipo de soporte que necesitas."
            )

            .setFooter({
                text:
                    "NR TICKET • Support System"
            });

    const menu =
        new StringSelectMenuBuilder()

            .setCustomId(
                "ticket_category"
            )

            .setPlaceholder(
                isEnglish
                    ? "Select a category"
                    : "Selecciona una categoría"
            )

            .addOptions(

                {
                    label:
                        isEnglish
                            ? "General Support"
                            : "Soporte General",

                    value:
                        "soporte",

                    emoji:
                        "🎫"
                },

                {
                    label:
                        isEnglish
                            ? "Report"
                            : "Reporte",

                    value:
                        "reporte",

                    emoji:
                        "🚨"
                },

                {
                    label:
                        isEnglish
                            ? "Partnership"
                            : "Alianza",

                    value:
                        "alianza",

                    emoji:
                        "🤝"
                },

                {
                    label:
                        isEnglish
                            ? "Appeal"
                            : "Apelación",

                    value:
                        "apelacion",

                    emoji:
                        "⚖️"
                },

                {
                    label:
                        isEnglish
                            ? "Other"
                            : "Otro",

                    value:
                        "otro",

                    emoji:
                        "📩"
                }
            );

    return {

        embeds: [
            embed
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ]
    };
}

/* =========================================================
   SLASH COMMANDS
   /help
   /setup
   ========================================================= */

const slashCommands = [

    new SlashCommandBuilder()

        .setName(
            "help"
        )

        .setDescription(
            "Muestra la información de NR TICKET"
        ),

    new SlashCommandBuilder()

        .setName(
            "setup"
        )

        .setDescription(
            "Configura NR TICKET en este servidor"
        )

        .addChannelOption(
            option =>
                option

                    .setName(
                        "categoria"
                    )

                    .setDescription(
                        "Categoría donde se crearán los tickets"
                    )

                    .addChannelTypes(
                        ChannelType.GuildCategory
                    )

                    .setRequired(
                        false
                    )
        )

        .addRoleOption(
            option =>
                option

                    .setName(
                        "staff"
                    )

                    .setDescription(
                        "Rol que tendrá acceso a los tickets"
                    )

                    .setRequired(
                        false
                    )
        )

        .addChannelOption(
            option =>
                option

                    .setName(
                        "logs"
                    )

                    .setDescription(
                        "Canal donde se enviarán los logs"
                    )

                    .addChannelTypes(
                        ChannelType.GuildText
                    )

                    .setRequired(
                        false
                    )
        )
];

/* =========================================================
   REGISTRAR SLASH COMMANDS
   ========================================================= */

async function registerSlashCommands() {

    if (
        !process.env.DISCORD_TOKEN ||
        !process.env.CLIENT_ID
    ) {

        console.warn(
            "[NR TICKET] No se registraron slash commands: falta DISCORD_TOKEN o CLIENT_ID."
        );

        return;
    }

    try {

        const rest =
            new REST({
                version:
                    "10"
            }).setToken(
                process.env.DISCORD_TOKEN
            );

        await rest.put(

            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),

            {
                body:
                    slashCommands.map(
                        command =>
                            command.toJSON()
                    )
            }
        );

        console.log(
            "[NR TICKET] Slash commands registrados correctamente."
        );

    } catch (
        error
    ) {

        console.error(
            "[NR TICKET] Error registrando slash commands:",
            error
        );
    }
}

/* =========================================================
   INTERACCIONES
   ========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        try {

            /* ==========================================
               SLASH COMMANDS
               ========================================== */

            if (
                interaction.isChatInputCommand()
            ) {

                /* ======================================
                   /help
                   ====================================== */

                if (
                    interaction.commandName ===
                    "help"
                ) {

                    const language =
                        interaction.guild
                            ? guildLanguage(
                                interaction.guild.id
                            )
                            : DEFAULT_LANGUAGE;

                    const embed =
                        new EmbedBuilder()

                            .setColor(
                                0x5865F2
                            )

                            .setTitle(
                                "🎫 NR TICKET • AYUDA"
                            )

                            .setDescription(
                                language === "en"
                                    ? "Advanced support and ticket management system."
                                    : "Sistema avanzado de soporte y gestión de tickets."
                            )

                            .addFields(

                                {
                                    name:
                                        "🎫 Tickets",

                                    value:
                                        language === "en"
                                            ? "Create and manage support tickets."
                                            : "Crea y administra tickets de soporte.",

                                    inline:
                                        false
                                },

                                {
                                    name:
                                        "⚙️ /setup",

                                    value:
                                        language === "en"
                                            ? "Configure the ticket category, staff role and logs."
                                            : "Configura la categoría de tickets, rol de staff y logs.",

                                    inline:
                                        false
                                },

                                {
                                    name:
                                        "🎛️ =panel",

                                    value:
                                        language === "en"
                                            ? "Send the ticket panel."
                                            : "Envía el panel de tickets.",

                                    inline:
                                        false
                                },

                                {
                                    name:
                                        "📊 =stats",

                                    value:
                                        language === "en"
                                            ? "View ticket statistics."
                                            : "Muestra las estadísticas de tickets.",

                                    inline:
                                        false
                                },

                                {
                                    name:
                                        "🌐 =idioma",

                                    value:
                                        language === "en"
                                            ? "Change the server language."
                                            : "Cambia el idioma del servidor.",

                                    inline:
                                        false
                                }
                            )

                            .addFields(

                                {
                                    name:
                                        "🌐 Dashboard",

                                    value:
                                        `[Abrir Dashboard](${DASHBOARD_URL})`,

                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "🛟 Servidor de soporte",

                                    value:
                                        `[Entrar al servidor](${SUPPORT_SERVER_URL})`,

                                    inline:
                                        true
                                }
                            )

                            .setFooter({
                                text:
                                    "NR TICKET • Multi Language"
                            })

                            .setTimestamp();

                    const buttons =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()

                                    .setLabel(
                                        "Dashboard"
                                    )

                                    .setEmoji(
                                        "🌐"
                                    )

                                    .setStyle(
                                        ButtonStyle.Link
                                    )

                                    .setURL(
                                        DASHBOARD_URL
                                    ),

                                new ButtonBuilder()

                                    .setLabel(
                                        "Servidor de soporte"
                                    )

                                    .setEmoji(
                                        "🛟"
                                    )

                                    .setStyle(
                                        ButtonStyle.Link
                                    )

                                    .setURL(
                                        SUPPORT_SERVER_URL
                                    )
                            );

                    return interaction.reply({

                        embeds: [
                            embed
                        ],

                        components: [
                            buttons
                        ],

                        ephemeral:
                            false
                    });
                }

                /* ======================================
                   /setup
                   ====================================== */

                if (
                    interaction.commandName ===
                    "setup"
                ) {

                    if (
                        !interaction.member.permissions.has(
                            PermissionFlagsBits.Administrator
                        )
                    ) {

                        return interaction.reply({

                            content:
                                "❌ Necesitas permisos de **Administrador** para usar `/setup`.",

                            ephemeral:
                                true
                        });
                    }

                    const category =
                        interaction.options.getChannel(
                            "categoria"
                        );

                    const staffRole =
                        interaction.options.getRole(
                            "staff"
                        );

                    const logs =
                        interaction.options.getChannel(
                            "logs"
                        );

                    const config =
                        getServerConfig(
                            interaction.guild.id
                        );

                    if (category) {

                        config.ticket.categoryId =
                            category.id;
                    }

                    if (staffRole) {

                        config.ticket.staffRoleId =
                            staffRole.id;
                    }

                    if (logs) {

                        config.ticket.logsChannelId =
                            logs.id;
                    }

                    saveServerConfig(
                        interaction.guild.id,
                        config
                    );

                    await createLog(

                        interaction.guild,

                        "SETUP_UPDATED",

                        {
                            Usuario:
                                interaction.user.tag,

                            Categoría:
                                category
                                    ? category.name
                                    : "Sin cambios",

                            Staff:
                                staffRole
                                    ? staffRole.name
                                    : "Sin cambios",

                            Logs:
                                logs
                                    ? logs.name
                                    : "Sin cambios"
                        }
                    );

                    const embed =
                        new EmbedBuilder()

                            .setColor(
                                0x57F287
                            )

                            .setTitle(
                                "⚙️ NR TICKET • SETUP"
                            )

                            .setDescription(
                                "La configuración de NR TICKET fue actualizada correctamente."
                            )

                            .addFields(

                                {
                                    name:
                                        "📁 Categoría",

                                    value:
                                        config.ticket.categoryId
                                            ? `<#${config.ticket.categoryId}>`
                                            : "No configurada",

                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "🛡️ Staff",

                                    value:
                                        config.ticket.staffRoleId
                                            ? `<@&${config.ticket.staffRoleId}>`
                                            : "No configurado",

                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "📋 Logs",

                                    value:
                                        config.ticket.logsChannelId
                                            ? `<#${config.ticket.logsChannelId}>`
                                            : "No configurado",

                                    inline:
                                        true
                                }
                            )

                            .addFields({

                                name:
                                    "🌐 Dashboard",

                                value:
                                    `[Abrir Dashboard](${DASHBOARD_URL})`
                            })

                            .setTimestamp();

                    return interaction.reply({

                        embeds: [
                            embed
                        ],

                        ephemeral:
                            false
                    });
                }
            }

            /* ==========================================
               SELECT MENU
               ========================================== */

            if (
                interaction.isStringSelectMenu()
            ) {

                if (
                    interaction.customId ===
                    "ticket_category"
                ) {

                    const category =
                        interaction.values[0];

                    await interaction.deferReply({
                        ephemeral:
                            true
                    });

                    const channel =
                        await createTicket({

                            guild:
                                interaction.guild,

                            user:
                                interaction.user,

                            category
                        });

                    await interaction.editReply({

                        content:
                            `✅ Ticket creado correctamente: ${channel}`
                    });

                    return;
                }
            }

            /* ==========================================
               BOTONES
               ========================================== */

            if (
                interaction.isButton()
            ) {

                const [
                    action,
                    ticketId
                ] =
                    interaction.customId.split(
                        ":"
                    );

                if (
                    !ticketId
                ) {
                    return;
                }

                const ticket =
                    findTicket(
                        ticketId
                    );

                if (
                    !ticket
                ) {

                    return interaction.reply({

                        content:
                            "❌ Ticket no encontrado.",

                        ephemeral:
                            true
                    });
                }

                /* ======================================
                   CLAIM
                   ====================================== */

                if (
                    action ===
                    "ticket_claim"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({

                            content:
                                translate(
                                    guildLanguage(
                                        interaction.guild.id
                                    ),
                                    "no_permission"
                                ),

                            ephemeral:
                                true
                        });
                    }

                    await claimTicket(
                        ticket,
                        interaction.member
                    );

                    return interaction.reply({

                        content:
                            "🛠️ Ticket reclamado correctamente.",

                        ephemeral:
                            true
                    });
                }

                /* ======================================
                   CLOSE
                   ====================================== */

                if (
                    action ===
                    "ticket_close"
                ) {

                    const owner =
                        ticket.userId ===
                        interaction.user.id;

                    const staff =
                        isStaff(
                            interaction.member
                        );

                    if (
                        !owner &&
                        !staff
                    ) {

                        return interaction.reply({

                            content:
                                translate(
                                    guildLanguage(
                                        interaction.guild.id
                                    ),
                                    "no_permission"
                                ),

                            ephemeral:
                                true
                        });
                    }

                    await interaction.reply({

                        content:
                            "🔒 Cerrando ticket...",

                        ephemeral:
                            true
                    });

                    await closeTicket(
                        ticket,
                        interaction.member
                    );

                    return;
                }

                /* ======================================
                   ADD
                   ====================================== */

                if (
                    action ===
                    "ticket_add"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({

                            content:
                                translate(
                                    guildLanguage(
                                        interaction.guild.id
                                    ),
                                    "no_permission"
                                ),

                            ephemeral:
                                true
                        });
                    }

                    const modal =
                        new ModalBuilder()

                            .setCustomId(
                                `ticket_add_modal:${ticketId}`
                            )

                            .setTitle(
                                "Añadir usuario"
                            );

                    const input =
                        new TextInputBuilder()

                            .setCustomId(
                                "user_id"
                            )

                            .setLabel(
                                "ID del usuario"
                            )

                            .setPlaceholder(
                                "123456789012345678"
                            )

                            .setStyle(
                                TextInputStyle.Short
                            )

                            .setRequired(
                                true
                            );

                    modal.addComponents(

                        new ActionRowBuilder()
                            .addComponents(
                                input
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                /* ======================================
                   REMOVE
                   ====================================== */

                if (
                    action ===
                    "ticket_remove"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({

                            content:
                                translate(
                                    guildLanguage(
                                        interaction.guild.id
                                    ),
                                    "no_permission"
                                ),

                            ephemeral:
                                true
                        });
                    }

                    const modal =
                        new ModalBuilder()

                            .setCustomId(
                                `ticket_remove_modal:${ticketId}`
                            )

                            .setTitle(
                                "Remover usuario"
                            );

                    const input =
                        new TextInputBuilder()

                            .setCustomId(
                                "user_id"
                            )

                            .setLabel(
                                "ID del usuario"
                            )

                            .setStyle(
                                TextInputStyle.Short
                            )

                            .setRequired(
                                true
                            );

                    modal.addComponents(

                        new ActionRowBuilder()
                            .addComponents(
                                input
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }
            }

            /* ==========================================
               MODALES
               ========================================== */

            if (
                interaction.isModalSubmit()
            ) {

                const [
                    action,
                    ticketId
                ] =
                    interaction.customId.split(
                        ":"
                    );

                const ticket =
                    findTicket(
                        ticketId
                    );

                if (
                    !ticket
                ) {

                    return interaction.reply({

                        content:
                            "❌ Ticket no encontrado.",

                        ephemeral:
                            true
                    });
                }

                if (
                    !isStaff(
                        interaction.member
                    )
                ) {

                    return interaction.reply({

                        content:
                            "❌ No tienes permisos.",

                        ephemeral:
                            true
                    });
                }

                const userId =
                    interaction.fields.getTextInputValue(
                        "user_id"
                    );

                if (
                    !/^\d{17,20}$/.test(
                        userId
                    )
                ) {

                    return interaction.reply({

                        content:
                            "❌ ID de usuario inválido.",

                        ephemeral:
                            true
                    });
                }

                if (
                    action ===
                    "ticket_add_modal"
                ) {

                    await addUserToTicket(
                        ticket,
                        interaction.guild,
                        userId
                    );

                    await interaction.reply({

                        content:
                            `✅ <@${userId}> fue añadido al ticket.`,

                        ephemeral:
                            true
                    });

                    return;
                }

                if (
                    action ===
                    "ticket_remove_modal"
                ) {

                    await removeUserFromTicket(
                        ticket,
                        interaction.guild,
                        userId
                    );

                    await interaction.reply({

                        content:
                            `✅ <@${userId}> fue removido del ticket.`,

                        ephemeral:
                            true
                    });

                    return;
                }
            }

        } catch (
            error
        ) {

            console.error(
                "[INTERACTION ERROR]",
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp({

                    content:
                        "❌ Ocurrió un error.",

                    ephemeral:
                        true

                }).catch(
                    () => {}
                );

            } else {

                await interaction.reply({

                    content:
                        "❌ Ocurrió un error.",

                    ephemeral:
                        true

                }).catch(
                    () => {}
                );
            }
        }
    }
);

/* =========================================================
   COMANDOS PREFIJO
   ========================================================= */

client.on(
    "messageCreate",
    async message => {

        if (
            message.author.bot ||
            !message.guild
        ) {
            return;
        }

        if (
            !message.content.startsWith(
                PREFIX
            )
        ) {
            return;
        }

        const args =
            message.content
                .slice(
                    PREFIX.length
                )
                .trim()
                .split(
                    /\s+/
                );

        const command =
            args.shift()
                ?.toLowerCase();

        if (!command) {
            return;
        }

        const config =
            getServerConfig(
                message.guild.id
            );

        const language =
            guildLanguage(
                message.guild.id
            );

        /* ========================================
           =panel
           ======================================== */

        if (
            command ===
            "panel"
        ) {

            if (
                !isStaff(
                    message.member
                )
            ) {

                return message.reply({

                    content:
                        translate(
                            language,
                            "no_permission"
                        )
                });
            }

            return message.channel.send(
                buildTicketPanel(
                    language
                )
            );
        }

        /* ========================================
           =idioma
           ======================================== */

        if (
            command ===
            "idioma"
        ) {

            if (
                !isStaff(
                    message.member
                )
            ) {

                return message.reply({

                    content:
                        translate(
                            language,
                            "no_permission"
                        )
                });
            }

            const selected =
                args[0]
                    ?.toLowerCase();

            if (
                !LANGUAGES.includes(
                    selected
                )
            ) {

                return message.reply({

                    content:
                        `🌐 Idiomas disponibles: ${LANGUAGES.join(", ")}`
                });
            }

            config.language =
                selected;

            saveServerConfig(
                message.guild.id,
                config
            );

            return message.reply({

                content:
                    translate(
                        selected,
                        "language_changed"
                    )
            });
        }

        /* ========================================
           =stats
           ======================================== */

        if (
            command ===
            "stats"
        ) {

            if (
                !isStaff(
                    message.member
                )
            ) {

                return message.reply({

                    content:
                        translate(
                            language,
                            "no_permission"
                        )
                });
            }

            const stats =
                getStatistics(
                    message.guild.id
                );

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        "📊 NR TICKET • Estadísticas"
                    )

                    .addFields(

                        {
                            name:
                                "🎫 Creados",

                            value:
                                String(
                                    stats.ticketsCreated
                                ),

                            inline:
                                true
                        },

                        {
                            name:
                                "🔒 Cerrados",

                            value:
                                String(
                                    stats.ticketsClosed
                                ),

                            inline:
                                true
                        },

                        {
                            name:
                                "🛠️ Reclamados",

                            value:
                                String(
                                    stats.ticketsClaimed
                                ),

                            inline:
                                true
                        },

                        {
                            name:
                                "📋 Formularios",

                            value:
                                String(
                                    stats.formsSubmitted
                                ),

                            inline:
                                true
                        }
                    )

                    .setTimestamp();

            return message.reply({

                embeds: [
                    embed
                ]
            });
        }

        /* ========================================
           =config
           ======================================== */

        if (
            command ===
            "config"
        ) {

            if (
                !message.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )
            ) {

                return message.reply({

                    content:
                        translate(
                            language,
                            "no_permission"
                        )
                });
            }

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        "⚙️ NR TICKET • Configuración"
                    )

                    .addFields(

                        {
                            name:
                                "🌐 Idioma",

                            value:
                                config.language ||
                                "es",

                            inline:
                                true
                        },

                        {
                            name:
                                "🎫 Tickets",

                            value:
                                config.ticket.enabled
                                    ? "🟢 Activados"
                                    : "🔴 Desactivados",

                            inline:
                                true
                        },

                        {
                            name:
                                "📁 Categoría",

                            value:
                                config.ticket.categoryId
                                    ? `<#${config.ticket.categoryId}>`
                                    : "No configurada",

                            inline:
                                true
                        },

                        {
                            name:
                                "🛡️ Staff",

                            value:
                                config.ticket.staffRoleId
                                    ? `<@&${config.ticket.staffRoleId}>`
                                    : "No configurado",

                            inline:
                                true
                        },

                        {
                            name:
                                "📋 Logs",

                            value:
                                config.ticket.logsChannelId
                                    ? `<#${config.ticket.logsChannelId}>`
                                    : "No configurado",

                            inline:
                                true
                        },

                        {
                            name:
                                "🌐 Dashboard",

                            value:
                                `[Abrir Dashboard](${DASHBOARD_URL})`,

                            inline:
                                false
                        }
                    );

            return message.reply({

                embeds: [
                    embed
                ]
            });
        }
    }
);

/* =========================================================
   EXPRESS
   ========================================================= */

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

app.use(
    express.json({
        limit:
            "5mb"
    })
);

app.use(
    express.urlencoded({

        extended:
            true,

        limit:
            "5mb"
    })
);

/* =========================================================
   SESSION
   ========================================================= */

app.use(
    session({

        name:
            "nr_ticket_session",

        secret:
            process.env.SESSION_SECRET ||
            "CHANGE_THIS_SECRET",

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            secure:
                process.env.NODE_ENV ===
                "production",

            sameSite:
                "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24 *
                7
        }
    })
);

/* =========================================================
   IDIOMA WEB
   ========================================================= */

app.use(
    (req, res, next) => {

        if (
            !req.session.language
        ) {

            req.session.language =
                DEFAULT_LANGUAGE;
        }

        if (
            !LANGUAGES.includes(
                req.session.language
            )
        ) {

            req.session.language =
                DEFAULT_LANGUAGE;
        }

        req.language =
            req.session.language;

        req.t =
            (
                key,
                variables
            ) =>
                translate(
                    req.language,
                    key,
                    variables
                );

        next();
    }
);

/* =========================================================
   ESTÁTICOS
   ========================================================= */

app.use(
    "/dashboard",
    express.static(
        DASHBOARD_DIR
    )
);

app.use(
    "/public",
    express.static(
        PUBLIC_DIR
    )
);

app.use(
    "/assets",
    express.static(
        path.join(
            PUBLIC_DIR,
            "assets"
        )
    )
);

/* =========================================================
   AUTH
   ========================================================= */

function authenticated(
    req
) {

    return Boolean(
        req.session &&
        req.session.user
    );
}

function requireAuth(
    req,
    res,
    next
) {

    if (
        !authenticated(
            req
        )
    ) {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    authenticated:
                        false,

                    message:
                        req.t(
                            "not_authenticated"
                        )
                });
        }

        return res.redirect(
            "/login"
        );
    }

    next();
}

/* =========================================================
   API STATUS
   ========================================================= */

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            success:
                true,

            name:
                "NR TICKET",

            version:
                "2.0.0",

            bot: {

                online:
                    client.isReady(),

                username:
                    client.user
                        ?.tag ||
                    null,

                id:
                    client.user
                        ?.id ||
                    null
            },

            dashboard:
                true,

            dashboardUrl:
                DASHBOARD_URL,

            supportServer:
                SUPPORT_SERVER_URL,

            language:
                req.language,

            guilds:
                client.guilds.cache.size,

            uptime:
                process.uptime(),

            timestamp:
                new Date().toISOString()
        });
    }
);

/* =========================================================
   API IDIOMAS
   ========================================================= */

app.get(
    "/api/languages",
    (req, res) => {

        res.json({

            success:
                true,

            current:
                req.language,

            default:
                DEFAULT_LANGUAGE,

            languages:
                LANGUAGES.map(
                    code => ({

                        code,

                        name:
                            LANGUAGE_NAMES[
                                code
                            ]
                    })
                )
        });
    }
);

app.post(
    "/api/language",
    (req, res) => {

        const {
            language
        } = req.body;

        if (
            !LANGUAGES.includes(
                language
            )
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        req.t(
                            "invalid_language"
                        )
                });
        }

        req.session.language =
            language;

        res.json({

            success:
                true,

            language,

            name:
                LANGUAGE_NAMES[
                    language
                ],

            message:
                translate(
                    language,
                    "language_changed"
                )
        });
    }
);

/* =========================================================
   API USER
   ========================================================= */

app.get(
    "/api/user",
    (req, res) => {

        if (
            !authenticated(
                req
            )
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    authenticated:
                        false
                });
        }

        res.json({

            success:
                true,

            authenticated:
                true,

            user:
                req.session.user,

            language:
                req.language
        });
    }
);

/* =========================================================
   API GUILDS
   ========================================================= */

app.get(
    "/api/user/guilds",
    requireAuth,
    (req, res) => {

        const guilds =
            Array.isArray(
                req.session.user.guilds
            )
                ? req.session.user.guilds
                : [];

        res.json({

            success:
                true,

            guilds
        });
    }
);

/* =========================================================
   API GUILD
   ========================================================= */

app.get(
    "/api/guilds/:guildId",
    requireAuth,
    (req, res) => {

        const guild =
            client.guilds.cache.get(
                req.params.guildId
            );

        if (!guild) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    message:
                        req.t(
                            "guild_not_found"
                        )
                });
        }

        res.json({

            success:
                true,

            guild: {

                id:
                    guild.id,

                name:
                    guild.name,

                icon:
                    guild.iconURL({
                        size:
                            256
                    }),

                memberCount:
                    guild.memberCount
            },

            config:
                getServerConfig(
                    guild.id
                ),

            statistics:
                getStatistics(
                    guild.id
                )
        });
    }
);

/* =========================================================
   API CHANNELS
   ========================================================= */

app.get(
    "/api/guilds/:guildId/channels",
    requireAuth,
    (req, res) => {

        const guild =
            client.guilds.cache.get(
                req.params.guildId
            );

        if (!guild) {

            return res
                .status(404)
                .json({

                    success:
                        false
                });
        }

        const channels =
            guild.channels.cache.map(
                channel => ({

                    id:
                        channel.id,

                    name:
                        channel.name,

                    type:
                        channel.type,

                    parentId:
                        channel.parentId ||
                        null
                })
            );

        res.json({

            success:
                true,

            channels
        });
    }
);

/* =========================================================
   API ROLES
   ========================================================= */

app.get(
    "/api/guilds/:guildId/roles",
    requireAuth,
    (req, res) => {

        const guild =
            client.guilds.cache.get(
                req.params.guildId
            );

        if (!guild) {

            return res
                .status(404)
                .json({

                    success:
                        false
                });
        }

        const roles =
            guild.roles.cache

                .filter(
                    role =>
                        !role.managed
                )

                .map(
                    role => ({

                        id:
                            role.id,

                        name:
                            role.name,

                        color:
                            role.hexColor,

                        position:
                            role.position
                    })
                );

        res.json({

            success:
                true,

            roles
        });
    }
);

/* =========================================================
   API CONFIG
   ========================================================= */

app.get(
    "/api/guilds/:guildId/config",
    requireAuth,
    (req, res) => {

        res.json({

            success:
                true,

            config:
                getServerConfig(
                    req.params.guildId
                )
        });
    }
);

app.post(
    "/api/guilds/:guildId/config",
    requireAuth,
    (req, res) => {

        const guildId =
            req.params.guildId;

        const guild =
            client.guilds.cache.get(
                guildId
            );

        if (!guild) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    message:
                        req.t(
                            "guild_not_found"
                        )
                });
        }

        const config =
            getServerConfig(
                guildId
            );

        const incoming =
            req.body ||
            {};

        if (
            typeof incoming.language ===
            "string" &&
            LANGUAGES.includes(
                incoming.language
            )
        ) {

            config.language =
                incoming.language;
        }

        if (
            incoming.ticket &&
            typeof incoming.ticket ===
            "object"
        ) {

            config.ticket = {

                ...config.ticket,

                ...incoming.ticket
            };
        }

        if (
            incoming.panel &&
            typeof incoming.panel ===
            "object"
        ) {

            config.panel = {

                ...config.panel,

                ...incoming.panel
            };
        }

        saveServerConfig(
            guildId,
            config
        );

        res.json({

            success:
                true,

            config
        });
    }
);

/* =========================================================
   API TICKETS
   ========================================================= */

app.get(
    "/api/guilds/:guildId/tickets",
    requireAuth,
    (req, res) => {

        const tickets =
            getTickets().filter(
                ticket =>
                    ticket.guildId ===
                    req.params.guildId
            );

        res.json({

            success:
                true,

            tickets
        });
    }
);

app.post(
    "/api/guilds/:guildId/tickets",
    requireAuth,
    async (req, res) => {

        try {

            const guild =
                client.guilds.cache.get(
                    req.params.guildId
                );

            if (!guild) {

                return res
                    .status(404)
                    .json({

                        success:
                            false
                    });
            }

            const userId =
                req.body.userId ||
                req.session.user.id;

            const user =
                await client.users.fetch(
                    userId
                );

            const channel =
                await createTicket({

                    guild,

                    user,

                    category:
                        req.body.category ||
                        "soporte",

                    panelId:
                        req.body.panelId ||
                        null
                });

            res.json({

                success:
                    true,

                channelId:
                    channel.id,

                url:
                    `https://discord.com/channels/${guild.id}/${channel.id}`
            });

        } catch (
            error
        ) {

            console.error(
                "[API TICKET]",
                error
            );

            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        error.message
                });
        }
    }
);

/* =========================================================
   API ESTADÍSTICAS
   ========================================================= */

app.get(
    "/api/guilds/:guildId/statistics",
    requireAuth,
    (req, res) => {

        res.json({

            success:
                true,

            statistics:
                getStatistics(
                    req.params.guildId
                )
        });
    }
);

/* =========================================================
   LOGIN / DASHBOARD
   ========================================================= */

app.get(
    "/",
    (req, res) => {

        res.redirect(

            authenticated(
                req
            )
                ? "/dashboard/"
                : "/login"
        );
    }
);

app.get(
    "/login",
    (req, res) => {

        const file =
            path.join(
                DASHBOARD_DIR,
                "login.html"
            );

        if (
            !fs.existsSync(
                file
            )
        ) {

            return res
                .status(404)
                .send(
                    "login.html no encontrado."
                );
        }

        res.sendFile(
            file
        );
    }
);

app.get(
    "/dashboard/",
    requireAuth,
    (req, res) => {

        const file =
            path.join(
                DASHBOARD_DIR,
                "index.html"
            );

        if (
            !fs.existsSync(
                file
            )
        ) {

            return res
                .status(404)
                .send(
                    "index.html no encontrado."
                );
        }

        res.sendFile(
            file
        );
    }
);

app.get(
    "/dashboard/app",
    requireAuth,
    (req, res) => {

        const file =
            path.join(
                DASHBOARD_DIR,
                "app.html"
            );

        if (
            !fs.existsSync(
                file
            )
        ) {

            return res
                .status(404)
                .send(
                    "app.html no encontrado."
                );
        }

        res.sendFile(
            file
        );
    }
);

/* =========================================================
   LOGOUT
   ========================================================= */

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(
            error => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            success:
                                false,

                            message:
                                "No se pudo cerrar sesión."
                        });
                }

                res.clearCookie(
                    "nr_ticket_session"
                );

                res.json({

                    success:
                        true,

                    message:
                        "Sesión cerrada."
                });
            }
        );
    }
);

/* =========================================================
   HEALTH
   ========================================================= */

app.get(
    "/health",
    (req, res) => {

        res.status(
            200
        ).json({

            status:
                "ok",

            bot:
                client.isReady(),

            uptime:
                process.uptime(),

            timestamp:
                new Date().toISOString()
        });
    }
);

/* =========================================================
   RUTAS OPCIONALES
   ========================================================= */

function optionalRequire(
    file
) {

    try {

        return require(
            file
        );

    } catch (
        error
    ) {

        console.warn(
            `[NR TICKET] Ruta opcional no cargada: ${file}`
        );

        return null;
    }
}

const authRoutes =
    optionalRequire(
        "./routes/auth"
    );

const dashboardRoutes =
    optionalRequire(
        "./routes/dashboard"
    );

const ticketRoutes =
    optionalRequire(
        "./routes/tickets"
    );

const panelRoutes =
    optionalRequire(
        "./routes/panels"
    );

const formRoutes =
    optionalRequire(
        "./routes/forms"
    );

if (authRoutes) {

    app.use(
        "/auth",
        authRoutes
    );
}

if (dashboardRoutes) {

    app.use(
        "/api/dashboard",
        dashboardRoutes
    );
}

if (ticketRoutes) {

    app.use(
        "/api/tickets",
        ticketRoutes
    );
}

if (panelRoutes) {

    app.use(
        "/api/panels",
        panelRoutes
    );
}

if (formRoutes) {

    app.use(
        "/api/forms",
        formRoutes
    );
}

/* =========================================================
   404
   ========================================================= */

app.use(
    (req, res) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    message:
                        req.t(
                            "route_not_found"
                        )
                });
        }

        res
            .status(404)
            .send(
                "Página no encontrada."
            );
    }
);

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "[NR TICKET ERROR]",
            error
        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }

        res
            .status(500)
            .json({

                success:
                    false,

                message:
                    req.t
                        ? req.t(
                            "internal_error"
                        )
                        : "Error interno."
            });
    }
);

/* =========================================================
   READY
   ========================================================= */

client.once(
    "ready",
    async () => {

        console.log(
            "======================================"
        );

        console.log(
            "          NR TICKET ONLINE"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🤖 Bot: ${client.user.tag}`
        );

        console.log(
            `🆔 ID: ${client.user.id}`
        );

        console.log(
            `🌐 Servidores: ${client.guilds.cache.size}`
        );

        console.log(
            `🌎 Idiomas: ${LANGUAGES.length}`
        );

        console.log(
            `🖥️ Puerto: ${PORT}`
        );

        console.log(
            `🌐 Dashboard: ${DASHBOARD_URL}`
        );

        console.log(
            `🛟 Soporte: ${SUPPORT_SERVER_URL}`
        );

        console.log(
            "======================================"
        );

        await registerSlashCommands();
    }
);

/* =========================================================
   EVENTOS
   ========================================================= */

client.on(
    "guildCreate",
    guild => {

        getServerConfig(
            guild.id
        );

        console.log(
            `[GUILD CREATE] ${guild.name}`
        );
    }
);

client.on(
    "guildDelete",
    guild => {

        console.log(
            `[GUILD DELETE] ${guild.name}`
        );
    }
);

client.on(
    "error",
    error => {

        console.error(
            "[DISCORD ERROR]",
            error
        );
    }
);

client.on(
    "warn",
    warning => {

        console.warn(
            "[DISCORD WARN]",
            warning
        );
    }
);

/* =========================================================
   PROCESOS
   ========================================================= */

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "[UNHANDLED REJECTION]",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "[UNCAUGHT EXCEPTION]",
            error
        );
    }
);

process.on(
    "SIGINT",
    async () => {

        console.log(
            "[NR TICKET] Cerrando..."
        );

        try {

            client.destroy();

        } catch {}

        process.exit(
            0
        );
    }
);

process.on(
    "SIGTERM",
    async () => {

        console.log(
            "[NR TICKET] Cerrando..."
        );

        try {

            client.destroy();

        } catch {}

        process.exit(
            0
        );
    }
);

/* =========================================================
   INICIAR EXPRESS
   ========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `[NR TICKET] Dashboard iniciado en puerto ${PORT}`
        );

        console.log(
            `[NR TICKET] URL: ${DASHBOARD_URL}`
        );
    }
);

/* =========================================================
   LOGIN DISCORD
   ========================================================= */

if (
    !process.env.DISCORD_TOKEN
) {

    console.error(
        "[NR TICKET] Falta DISCORD_TOKEN en las variables de entorno."
    );

} else {

    client.login(
        process.env.DISCORD_TOKEN
    ).catch(
        error => {

            console.error(
                "[NR TICKET] Error iniciando Discord:"
            );

            console.error(
                error.message
            );
        }
    );
}

/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {

    app,

    client,

    translate,

    getServerConfig,

    saveServerConfig,

    getStatistics,

    createTicket,

    closeTicket,

    claimTicket,

    createLog,

    getTickets,

    LANGUAGES,

    DASHBOARD_URL,

    SUPPORT_SERVER_URL
};
