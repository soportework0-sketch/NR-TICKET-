const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ Falta DISCORD_TOKEN en las variables de entorno.");
  process.exit(1);
}

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DB = {
  guilds: {},
  panels: {},
  tickets: {},
  forms: {},
  applications: {},
  sessions: {},
  logs: {}
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return structuredClone(DEFAULT_DB);
    }

    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    return {
      ...structuredClone(DEFAULT_DB),
      ...data
    };
  } catch (error) {
    console.error("❌ Error leyendo database.json:", error);
    return structuredClone(DEFAULT_DB);
  }
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("❌ Error guardando database.json:", error);
  }
}

function id() {
  return crypto.randomBytes(12).toString("hex");
}

function escapeHTML(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getGuildConfig(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      logsChannel: null,
      notificationChannel: null,
      earthquakeAlerts: {
        enabled: false,
        country: "Colombia",
        channel: null,
        mention: "@here"
      },
      panels: []
    };

    saveDB();
  }

  return db.guilds[guildId];
}

/* =========================================================
   CLIENT DISCORD
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ]
});

client.panels = new Collection();
client.tickets = new Collection();
client.forms = new Collection();

/* =========================================================
   EXPRESS
========================================================= */

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>NR TICKET</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#080b12;
  color:#fff;
  font-family:Arial,Helvetica,sans-serif;
}

.container{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:30px;
}

.card{
  width:100%;
  max-width:650px;
  background:#10151f;
  border:1px solid #202838;
  border-radius:24px;
  padding:45px;
  box-shadow:0 20px 70px rgba(0,0,0,.45);
}

.logo{
  font-size:42px;
  font-weight:900;
  margin-bottom:12px;
}

.title{
  font-size:24px;
  font-weight:700;
}

.description{
  color:#aeb7c7;
  line-height:1.7;
  margin:15px 0 30px;
}

.buttons{
  display:grid;
  gap:12px;
}

.button{
  display:block;
  text-decoration:none;
  color:white;
  background:#5865f2;
  padding:16px;
  border-radius:12px;
  text-align:center;
  font-weight:700;
}

.button.secondary{
  background:#171e2b;
  border:1px solid #283244;
}
</style>
</head>

<body>

<div class="container">
  <div class="card">

    <div class="logo">👑 NR TICKET</div>

    <div class="title">
      👋 ¡Hola! Bienvenido a NR TICKET
    </div>

    <div class="description">
      Administra tus servidores, crea paneles de tickets,
      formularios y gestiona solicitudes desde un único lugar.
    </div>

    <div class="buttons">

      <a class="button" href="/dashboard">
        🌐 Panel Web
      </a>

      <a class="button secondary" href="/support">
        🛟 Soporte Web
      </a>

      <a class="button secondary" href="/server">
        🎫 Soporte Server
      </a>

    </div>

  </div>
</div>

</body>
</html>
  `);
});

/* =========================================================
   DASHBOARD
========================================================= */

app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>NR TICKET — Dashboard</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#080b12;
 color:#fff;
 font-family:Arial,Helvetica,sans-serif;
}

.layout{
 display:flex;
 min-height:100vh;
}

.sidebar{
 width:260px;
 background:#0d1119;
 border-right:1px solid #202838;
 padding:25px 15px;
}

.brand{
 font-size:24px;
 font-weight:900;
 margin-bottom:30px;
 padding:10px;
}

.nav{
 display:flex;
 flex-direction:column;
 gap:8px;
}

.nav a{
 text-decoration:none;
 color:#aeb7c7;
 padding:13px 15px;
 border-radius:10px;
}

.nav a:hover{
 background:#171e2b;
 color:white;
}

.content{
 flex:1;
 padding:35px;
}

.header{
 display:flex;
 justify-content:space-between;
 align-items:center;
 margin-bottom:30px;
}

.title{
 font-size:30px;
 font-weight:900;
}

.grid{
 display:grid;
 grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
 gap:20px;
}

.card{
 background:#10151f;
 border:1px solid #202838;
 border-radius:18px;
 padding:25px;
}

.server{
 min-height:210px;
 display:flex;
 flex-direction:column;
 justify-content:space-between;
}

.server-name{
 font-size:21px;
 font-weight:800;
}

.muted{
 color:#8d98aa;
 margin-top:8px;
}

.status{
 margin-top:15px;
}

.online{
 color:#48e18a;
}

.offline{
 color:#ff5c6c;
}

.btn{
 display:inline-block;
 background:#5865f2;
 color:#fff;
 text-decoration:none;
 padding:11px 16px;
 border-radius:10px;
 font-weight:700;
 border:none;
 cursor:pointer;
}

.btn.secondary{
 background:#171e2b;
 border:1px solid #283244;
}

</style>
</head>

<body>

<div class="layout">

<aside class="sidebar">

<div class="brand">
👑 NR TICKET
</div>

<div class="nav">

<a href="/dashboard">🏠 Inicio</a>
<a href="/dashboard/servers">⚙️ Administrar servidores</a>
<a href="/dashboard/tickets">🎫 Tickets</a>
<a href="/dashboard/forms">📝 Formularios</a>
<a href="/dashboard/support">🛟 Soporte</a>

</div>

</aside>

<main class="content">

<div class="header">
<div class="title">
🌐 Mis servidores
</div>

<div>
🔔
</div>
</div>

<div class="grid">

<div class="card server">

<div>
<div style="font-size:45px;">🖼️</div>

<div class="server-name">
STEAL NATION
</div>

<div class="muted">
👥 1,245 miembros
</div>

<div class="status online">
🟢 Bot instalado
</div>
</div>

<div>
<a class="btn" href="/dashboard/server/steal-nation">
⚙️ Administrar
</a>
</div>

</div>

<div class="card server">

<div>

<div style="font-size:45px;">🖼️</div>

<div class="server-name">
OTRO SERVIDOR
</div>

<div class="muted">
👥 500 miembros
</div>

<div class="status offline">
🔴 Sin permisos de administración
</div>

</div>

<div>
<a class="btn secondary" href="#">
➕ Invitar
</a>
</div>

</div>

</div>

</main>

</div>

</body>
</html>
  `);
});

/* =========================================================
   ADMINISTRAR SERVIDOR
========================================================= */

app.get("/dashboard/server/:guildId", (req, res) => {

  const guildId = req.params.guildId;

  res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>NR TICKET — Servidor</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial,Helvetica,sans-serif;
}

.layout{
 display:flex;
 min-height:100vh;
}

.sidebar{
 width:260px;
 background:#0d1119;
 border-right:1px solid #202838;
 padding:25px 15px;
}

.brand{
 font-size:24px;
 font-weight:900;
 margin-bottom:30px;
}

.nav{
 display:flex;
 flex-direction:column;
 gap:8px;
}

.nav a{
 color:#aeb7c7;
 text-decoration:none;
 padding:13px;
 border-radius:10px;
}

.nav a:hover{
 background:#171e2b;
 color:white;
}

.content{
 flex:1;
 padding:35px;
}

.welcome{
 background:#10151f;
 border:1px solid #202838;
 border-radius:20px;
 padding:25px;
 margin-bottom:25px;
 display:flex;
 justify-content:space-between;
 gap:20px;
}

.grid{
 display:grid;
 grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
 gap:18px;
}

.card{
 background:#10151f;
 border:1px solid #202838;
 border-radius:18px;
 padding:25px;
}

.card a{
 display:block;
 text-decoration:none;
 color:white;
}

.icon{
 font-size:34px;
 margin-bottom:15px;
}

.name{
 font-size:19px;
 font-weight:800;
}

.description{
 color:#8d98aa;
 margin-top:8px;
 line-height:1.5;
}

</style>

</head>

<body>

<div class="layout">

<aside class="sidebar">

<div class="brand">
👑 NR TICKET
</div>

<div class="nav">

<a href="/dashboard">🏠 Inicio</a>
<a href="/dashboard/servers">🌐 Mis servidores</a>
<a href="/dashboard/server/${guildId}/tickets">🎫 Tickets</a>
<a href="/dashboard/server/${guildId}/forms">📝 Formularios</a>
<a href="/dashboard/server/${guildId}/settings">⚙️ Configuración</a>

</div>

</aside>

<main class="content">

<div class="welcome">

<div>

<h1>
👋 Hola, ¿qué tal?
</h1>

<p style="color:#aeb7c7;line-height:1.6;">
Bienvenido al panel de STEAL NATION.
Puedes configurar las funciones opcionales
de NR TICKET para este servidor.
</p>

</div>

<div style="font-size:40px;">
🎫
</div>

</div>

<div class="grid">

<div class="card">

<a href="/dashboard/server/${guildId}/tickets">

<div class="icon">
🎫
</div>

<div class="name">
Tickets
</div>

<div class="description">
Crea y administra paneles de tickets.
</div>

</a>

</div>

<div class="card">

<a href="/dashboard/server/${guildId}/forms">

<div class="icon">
📝
</div>

<div class="name">
Formularios
</div>

<div class="description">
Crea formularios y gestiona solicitudes.
</div>

</a>

</div>

<div class="card">

<a href="/dashboard/server/${guildId}/settings">

<div class="icon">
⚙️
</div>

<div class="name">
Configuración
</div>

<div class="description">
Configura logs y notificaciones.
</div>

</a>

</div>

<div class="card">

<a href="/dashboard/server/${guildId}/earthquakes">

<div class="icon">
🌎
</div>

<div class="name">
Alertas sísmicas
</div>

<div class="description">
Configuración opcional de alertas.
</div>

</a>

</div>

</div>

</main>

</div>

</body>
</html>
  `);
});

/* =========================================================
   TICKETS DASHBOARD
========================================================= */

app.get("/dashboard/server/:guildId/tickets", (req, res) => {

  const guildId = req.params.guildId;
  const config = getGuildConfig(guildId);

  const panels = config.panels
    .map(panelId => db.panels[panelId])
    .filter(Boolean);

  const panelHTML = panels.length
    ? panels.map(panel => `
      <div class="panel-card">

        <div>

          <div class="panel-icon">
            🎫
          </div>

          <div class="panel-name">
            ${escapeHTML(panel.title || "Panel")}
          </div>

          <div class="muted">
            #${escapeHTML(panel.channelName || "sin canal")}
          </div>

          <div class="type">
            ${
              panel.ticketType === "private"
                ? "💬 Canal privado"
                : panel.ticketType === "thread"
                  ? "🧵 Hilo privado"
                  : "🔊 Canal de voz"
            }
          </div>

        </div>

        <div class="actions">

          <a href="/dashboard/server/${guildId}/tickets/${panel.id}">
            ⚙️ Administrar
          </a>

          <button onclick="deletePanel('${panel.id}')">
            🗑️ Eliminar
          </button>

        </div>

      </div>
    `).join("")
    : `
      <div class="empty">
        <div style="font-size:50px;">🎫</div>
        <h2>No hay paneles creados</h2>
        <p>Crea tu primer panel de tickets.</p>
      </div>
    `;

  res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>NR TICKET — Tickets</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial,Helvetica,sans-serif;
}

.layout{
 display:flex;
 min-height:100vh;
}

.sidebar{
 width:260px;
 background:#0d1119;
 border-right:1px solid #202838;
 padding:25px 15px;
}

.brand{
 font-size:24px;
 font-weight:900;
 margin-bottom:30px;
}

.nav{
 display:flex;
 flex-direction:column;
 gap:8px;
}

.nav a{
 color:#aeb7c7;
 text-decoration:none;
 padding:13px;
 border-radius:10px;
}

.nav a:hover{
 background:#171e2b;
 color:white;
}

.content{
 flex:1;
 padding:35px;
}

.header{
 display:flex;
 align-items:center;
 justify-content:space-between;
 margin-bottom:25px;
}

.title{
 font-size:30px;
 font-weight:900;
}

.create{
 background:#5865f2;
 color:white;
 text-decoration:none;
 padding:13px 18px;
 border-radius:11px;
 font-weight:800;
}

.panels{
 display:grid;
 grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
 gap:18px;
}

.panel-card{
 background:#10151f;
 border:1px solid #202838;
 border-radius:18px;
 padding:22px;
 min-height:230px;
 display:flex;
 flex-direction:column;
 justify-content:space-between;
}

.panel-icon{
 font-size:35px;
}

.panel-name{
 font-size:20px;
 font-weight:800;
 margin-top:10px;
}

.muted{
 color:#8d98aa;
 margin-top:5px;
}

.type{
 margin-top:15px;
 color:#b9c3d5;
}

.actions{
 display:flex;
 gap:10px;
 margin-top:20px;
}

.actions a,
.actions button{
 flex:1;
 padding:11px;
 border-radius:9px;
 text-align:center;
 border:1px solid #283244;
 background:#171e2b;
 color:white;
 text-decoration:none;
 cursor:pointer;
}

.empty{
 background:#10151f;
 border:1px solid #202838;
 border-radius:20px;
 padding:60px 30px;
 text-align:center;
 color:#aeb7c7;
}

</style>

</head>

<body>

<div class="layout">

<aside class="sidebar">

<div class="brand">
👑 NR TICKET
</div>

<div class="nav">

<a href="/dashboard/server/${guildId}">
🏠 Inicio
</a>

<a href="/dashboard/server/${guildId}/tickets">
🎫 Tickets
</a>

<a href="/dashboard/server/${guildId}/forms">
📝 Formularios
</a>

<a href="/dashboard/server/${guildId}/settings">
⚙️ Configuración
</a>

</div>

</aside>

<main class="content">

<div class="header">

<div class="title">
🎫 Tickets
</div>

<a class="create" href="/dashboard/server/${guildId}/tickets/create">
➕ Crear panel
</a>

</div>

<div class="panels">

${panelHTML}

</div>

</main>

</div>

<script>

async function deletePanel(panelId){

  const confirmed =
    confirm("¿Quieres eliminar este panel?");

  if(!confirmed) return;

  const response = await fetch(
    "/api/panels/" + panelId,
    {
      method:"DELETE"
    }
  );

  if(response.ok){
    location.reload();
  }else{
    alert("No se pudo eliminar el panel.");
  }

}

</script>

</body>
</html>
  `);
});

/* =========================================================
   CREAR PANEL — TIPO
========================================================= */

app.get("/dashboard/server/:guildId/tickets/create", (req, res) => {

  const guildId = req.params.guildId;

  res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>NR TICKET — Crear panel</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial,Helvetica,sans-serif;
}

.container{
 max-width:900px;
 margin:auto;
 padding:45px 25px;
}

.title{
 font-size:32px;
 font-weight:900;
 margin-bottom:10px;
}

.subtitle{
 color:#8d98aa;
 margin-bottom:35px;
}

.options{
 display:grid;
 grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
 gap:18px;
}

.option{
 background:#10151f;
 border:1px solid #202838;
 border-radius:18px;
 padding:30px;
 cursor:pointer;
 transition:.2s;
}

.option:hover{
 border-color:#5865f2;
 transform:translateY(-2px);
}

.icon{
 font-size:45px;
 margin-bottom:18px;
}

.name{
 font-size:20px;
 font-weight:900;
}

.description{
 color:#8d98aa;
 line-height:1.5;
 margin-top:8px;
}

</style>

</head>

<body>

<div class="container">

<div class="title">
🎫 Crear panel
</div>

<div class="subtitle">
¿Cómo quieres crear tus tickets?
</div>

<div class="options">

<div class="option"
onclick="create('private')">

<div class="icon">
💬
</div>

<div class="name">
CANAL PRIVADO
</div>

<div class="description">
Crea un canal privado para cada ticket.
</div>

</div>

<div class="option"
onclick="create('thread')">

<div class="icon">
🧵
</div>

<div class="name">
HILO PRIVADO
</div>

<div class="description">
Crea un hilo privado para cada ticket.
</div>

</div>

<div class="option"
onclick="create('voice')">

<div class="icon">
🔊
</div>

<div class="name">
CANAL DE VOZ
</div>

<div class="description">
Crea un canal de voz privado.
</div>

</div>

</div>

</div>

<script>

function create(type){

 location.href =
 "/dashboard/server/${guildId}/tickets/config?type="
 + encodeURIComponent(type);

}

</script>

</body>

</html>
  `);
});

/* =========================================================
   CONFIGURACIÓN DEL PANEL
========================================================= */

app.get("/dashboard/server/:guildId/tickets/config", (req, res) => {

  const guildId = req.params.guildId;
  const type = req.query.type || "private";

  const readableType =
    type === "private"
      ? "💬 Canal privado"
      : type === "thread"
        ? "🧵 Hilo privado"
        : "🔊 Canal de voz";

  res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>NR TICKET — Configuración</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial,Helvetica,sans-serif;
}

.container{
 max-width:850px;
 margin:auto;
 padding:40px 20px 80px;
}

h1{
 font-size:30px;
}

.section{
 background:#10151f;
 border:1px solid #202838;
 border-radius:18px;
 padding:25px;
 margin-top:20px;
}

.label{
 display:block;
 color:#aeb7c7;
 font-size:14px;
 font-weight:700;
 margin-bottom:8px;
}

.input{
 width:100%;
 background:#0b1018;
 border:1px solid #283244;
 border-radius:10px;
 padding:13px;
 color:white;
 outline:none;
 margin-bottom:18px;
}

.input:focus{
 border-color:#5865f2;
}

.check{
 display:flex;
 align-items:center;
 gap:10px;
 padding:10px 0;
 color:#c6cfdd;
}

.next{
 width:100%;
 margin-top:25px;
 background:#5865f2;
 border:0;
 color:white;
 padding:15px;
 border-radius:11px;
 font-weight:900;
 cursor:pointer;
}

.type{
 color:#5865f2;
 font-weight:800;
 margin-top:5px;
}

</style>

</head>

<body>

<div class="container">

<h1>
⚙️ CONFIGURACIÓN
</h1>

<div class="type">
Tipo seleccionado: ${readableType}
</div>

<form action="/api/panels/create" method="POST">

<input
type="hidden"
name="guildId"
value="${escapeHTML(guildId)}"
>

<input
type="hidden"
name="ticketType"
value="${escapeHTML(type)}"
>

<div class="section">

<h2>
👥 Acceso
</h2>

<label class="label">
Rol con acceso
</label>

<input
class="input"
name="staffRole"
placeholder="@Staff"
required
>

<label class="label">
Categoría
</label>

<input
class="input"
name="category"
placeholder="🎫 TICKETS"
required
>

<label class="label">
Canal de logs
</label>

<input
class="input"
name="logsChannel"
placeholder="#ticket-logs"
>

</div>

<div class="section">

<h2>
📡 Transacciones
</h2>

<label class="check">
<input type="checkbox" name="dm">
📩 MD
</label>

<label class="check">
<input type="checkbox" name="logs">
📜 Logs
</label>

<label class="check">
<input type="checkbox" name="dmLogs" checked>
📩📜 MD + Logs
</label>

</div>

<div class="section">

<h2>
📝 Contenido
</h2>

<label class="label">
Título
</label>

<input
class="input"
name="title"
value="🎫 Soporte STEAL NATION"
required
>

<label class="label">
Descripción
</label>

<textarea
class="input"
name="description"
rows="5"
required
>Selecciona una opción para recibir ayuda.</textarea>

<label class="label">
Color
</label>

<input
class="input"
name="color"
value="#5865F2"
>

<label class="label">
Imagen
</label>

<input
class="input"
name="image"
placeholder="https://..."
>

<label class="label">
Thumbnail
</label>

<input
class="input"
name="thumbnail"
placeholder="https://..."
>

<label class="label">
Footer
</label>

<input
class="input"
name="footer"
value="NR TICKET"
>

<label class="check">
<input type="checkbox" name="timestamp" checked>
Timestamp
</label>

</div>

<div class="section">

<h2>
🎛️ Componentes
</h2>

<label class="label">
Tipo de componente
</label>

<select class="input" name="componentType">

<option value="buttons">
🔘 Botones
</option>

<option value="select">
📋 Menú de selección
</option>

</select>

</div>

<div class="section">

<h2>
🔘 Opciones iniciales
</h2>

<label class="label">
Opciones separadas por coma
</label>

<input
class="input"
name="options"
value="🤝 Ally,🎫 Soporte,⚠️ Reporte,🏆 Premios"
>

<p style="color:#8d98aa;">
Máximo 20 opciones.
</p>

</div>

<button class="next">
➡️ Continuar
</button>

</form>

</div>

</body>

</html>
  `);
});

/* =========================================================
   API CREAR PANEL
========================================================= */

app.post("/api/panels/create", (req, res) => {

  const {
    guildId,
    ticketType,
    staffRole,
    category,
    logsChannel,
    title,
    description,
    color,
    image,
    thumbnail,
    footer,
    componentType,
    options
  } = req.body;

  if (!guildId || !title || !description) {
    return res.status(400).send("Faltan datos.");
  }

  const panelId = id();

  const parsedOptions = String(options || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((item, index) => {

      const emojiMatch = item.match(
        /^(\p{Extended_Pictographic})\s*(.*)$/u
      );

      if (emojiMatch) {
        return {
          id: `option_${index + 1}`,
          emoji: emojiMatch[1],
          name: emojiMatch[2] || "Opción",
          description: "",
          ticketType: "default"
        };
      }

      return {
        id: `option_${index + 1}`,
        emoji: "",
        name: item,
        description: "",
        ticketType: "default"
      };

    });

  const panel = {
    id: panelId,
    guildId,
    ticketType: ticketType || "private",
    staffRole: staffRole || null,
    category: category || null,
    logsChannel: logsChannel || null,

    transactions: {
      dm: Boolean(req.body.dm),
      logs: Boolean(req.body.logs),
      dmLogs: Boolean(req.body.dmLogs)
    },

    title,
    description,
    color: color || "#5865F2",
    image: image || null,
    thumbnail: thumbnail || null,
    footer: footer || "NR TICKET",
    timestamp: Boolean(req.body.timestamp),

    componentType: componentType || "buttons",

    options: parsedOptions,

    createdAt: Date.now(),
    channelId: null,
    channelName: null
  };

  db.panels[panelId] = panel;

  const config = getGuildConfig(guildId);

  config.panels.push(panelId);

  saveDB();

  res.redirect(
    `/dashboard/server/${guildId}/tickets/${panelId}/preview`
  );
});

/* =========================================================
   VISTA PREVIA
========================================================= */

app.get(
  "/dashboard/server/:guildId/tickets/:panelId/preview",
  (req, res) => {

    const panel =
      db.panels[req.params.panelId];

    if (!panel) {
      return res.status(404).send("Panel no encontrado.");
    }

    const options = panel.options
      .map(option => `
        <button class="discord-button">
          ${escapeHTML(option.emoji)}
          ${escapeHTML(option.name)}
        </button>
      `)
      .join("");

    res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>NR TICKET — Vista previa</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial,Helvetica,sans-serif;
}

.container{
 max-width:900px;
 margin:auto;
 padding:50px 20px;
}

.preview{
 background:#111820;
 border:1px solid #2b3444;
 border-radius:15px;
 padding:25px;
 max-width:700px;
}

.embed{
 border-left:5px solid #5865F2;
 background:#171d25;
 border-radius:7px;
 padding:20px;
}

.embed-title{
 font-size:20px;
 font-weight:900;
}

.embed-description{
 margin-top:12px;
 color:#c9d1dc;
 line-height:1.6;
 white-space:pre-wrap;
}

.discord-buttons{
 display:flex;
 flex-wrap:wrap;
 gap:8px;
 margin-top:18px;
}

.discord-button{
 background:#5865F2;
 color:white;
 border:0;
 border-radius:7px;
 padding:11px 15px;
 font-weight:700;
}

.publish{
 display:block;
 margin-top:25px;
 background:#48e18a;
 color:#06140b;
 text-decoration:none;
 text-align:center;
 padding:15px;
 border-radius:10px;
 font-weight:900;
}

</style>

</head>

<body>

<div class="container">

<h1>
👁️ VISTA PREVIA
</h1>

<div class="preview">

<div class="embed">

<div class="embed-title">
${escapeHTML(panel.title)}
</div>

<div class="embed-description">
${escapeHTML(panel.description)}
</div>

<div class="discord-buttons">

${options}

</div>

</div>

</div>

<a class="publish"
href="/dashboard/server/${panel.guildId}/tickets/${panel.id}/publish">

💾 Guardar y publicar

</a>

</div>

</body>

</html>
    `);
  }
);

/* =========================================================
   PUBLICAR PANEL
========================================================= */

app.get(
  "/dashboard/server/:guildId/tickets/:panelId/publish",
  (req, res) => {

    const panel =
      db.panels[req.params.panelId];

    if (!panel) {
      return res.status(404).send("Panel no encontrado.");
    }

    res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>NR TICKET — Publicar</title>

<style>

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial,Helvetica,sans-serif;
}

.container{
 max-width:600px;
 margin:auto;
 padding:60px 20px;
}

.card{
 background:#10151f;
 border:1px solid #202838;
 border-radius:20px;
 padding:30px;
}

select,
button{
 width:100%;
 padding:15px;
 border-radius:10px;
 margin-top:15px;
}

select{
 background:#0b1018;
 border:1px solid #283244;
 color:white;
}

button{
 background:#5865F2;
 border:0;
 color:white;
 font-weight:900;
 cursor:pointer;
}

</style>

</head>

<body>

<div class="container">

<div class="card">

<h1>
📢 Publicar panel
</h1>

<p style="color:#9aa5b6;">
¿Dónde quieres publicar este panel?
</p>

<form action="/api/panels/${panel.id}/publish" method="POST">

<select name="channelId">

<option value="">
#soporte
</option>

</select>

<button>
📢 Publicar
</button>

</form>

</div>

</div>

</body>

</html>
    `);
  }
);

/* =========================================================
   PUBLICAR EN DISCORD
========================================================= */

app.post("/api/panels/:panelId/publish", async (req, res) => {

  const panel =
    db.panels[req.params.panelId];

  if (!panel) {
    return res.status(404).send("Panel no encontrado.");
  }

  try {

    const guild =
      await client.guilds.fetch(panel.guildId);

    let channel = null;

    const requestedChannel =
      req.body.channelId;

    if (requestedChannel) {
      channel =
        await guild.channels
          .fetch(requestedChannel)
          .catch(() => null);
    }

    if (!channel) {

      channel =
        guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildText &&
            (
              c.name === "soporte" ||
              c.name === "support"
            )
        );

    }

    if (!channel) {

      channel =
        guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildText
        );

    }

    if (!channel) {
      return res
        .status(400)
        .send("No existe un canal de texto disponible.");
    }

    const embed =
      new EmbedBuilder()
        .setTitle(panel.title)
        .setDescription(panel.description)
        .setColor(panel.color || "#5865F2")
        .setFooter({
          text: panel.footer || "NR TICKET"
        });

    if (panel.image) {
      embed.setImage(panel.image);
    }

    if (panel.thumbnail) {
      embed.setThumbnail(panel.thumbnail);
    }

    if (panel.timestamp) {
      embed.setTimestamp();
    }

    const components = [];

    if (panel.componentType === "select") {

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(`ticket_select:${panel.id}`)
          .setPlaceholder("Selecciona una opción")
          .addOptions(
            panel.options.map(option => ({
              label:
                option.name.slice(0, 100),
              value:
                option.id,
              description:
                option.description
                  ? option.description.slice(0, 100)
                  : undefined,
              emoji:
                option.emoji || undefined
            }))
          );

      components.push(
        new ActionRowBuilder()
          .addComponents(menu)
      );

    } else {

      let row =
        new ActionRowBuilder();

      for (let i = 0; i < panel.options.length; i++) {

        const option =
          panel.options[i];

        const button =
          new ButtonBuilder()
            .setCustomId(
              `ticket_button:${panel.id}:${option.id}`
            )
            .setLabel(
              option.name.slice(0, 80)
            )
            .setStyle(ButtonStyle.Primary);

        if (option.emoji) {
          button.setEmoji(option.emoji);
        }

        if (row.components.length >= 5) {
          components.push(row);
          row = new ActionRowBuilder();
        }

        row.addComponents(button);
      }

      if (row.components.length) {
        components.push(row);
      }

    }

    const message =
      await channel.send({
        embeds: [embed],
        components
      });

    panel.channelId = channel.id;
    panel.channelName = channel.name;
    panel.messageId = message.id;

    saveDB();

    res.send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">

<title>NR TICKET — Publicado</title>

<style>

body{
 margin:0;
 background:#080b12;
 color:white;
 font-family:Arial;
 display:flex;
 justify-content:center;
 align-items:center;
 min-height:100vh;
}

.card{
 background:#10151f;
 border:1px solid #202838;
 border-radius:20px;
 padding:40px;
 text-align:center;
 max-width:500px;
}

.success{
 font-size:55px;
}

a{
 display:block;
 margin-top:20px;
 background:#5865F2;
 color:white;
 text-decoration:none;
 padding:13px;
 border-radius:10px;
 font-weight:bold;
}

</style>

</head>

<body>

<div class="card">

<div class="success">
✅
</div>

<h1>
Panel publicado
</h1>

<p style="color:#aeb7c7;">
NR TICKET publicó correctamente el panel en
#${escapeHTML(channel.name)}.
</p>

<a href="/dashboard/server/${panel.guildId}/tickets">
🎫 Volver a Tickets
</a>

</div>

</body>

</html>
    `);

  } catch (error) {

    console.error(
      "❌ Error publicando panel:",
      error
    );

    res
      .status(500)
      .send("No se pudo publicar el panel.");
  }

});

/* =========================================================
   CREAR TICKET
========================================================= */

async function createTicket(interaction, panel, option) {

  const guild =
    interaction.guild;

  const member =
    interaction.member;

  const existing =
    Object.values(db.tickets)
      .find(ticket =>
        ticket.guildId === guild.id &&
        ticket.userId === member.id &&
        ticket.status === "open"
      );

  if (existing) {

    const existingChannel =
      guild.channels.cache.get(
        existing.channelId
      );

    return interaction.reply({
      content:
        `❌ Ya tienes un ticket abierto: ${
          existingChannel
            ? existingChannel
            : "ticket existente"
        }`,
      ephemeral:true
    });

  }

  const ticketId = id();

  const cleanName =
    String(option.name || "ticket")
      .toLowerCase()
      .replace(/[^a-z0-9-]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 30) ||
      "ticket";

  let channel;

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionsBitField.Flags.ViewChannel
      ]
    },
    {
      id: member.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ];

  if (panel.staffRole) {

    const roleId =
      panel.staffRole.replace(/\D/g, "");

    if (roleId) {

      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });

    }

  }

  if (panel.ticketType === "voice") {

    channel =
      await guild.channels.create({
        name:`${cleanName}-${member.user.username}`
          .toLowerCase()
          .slice(0, 100),
        type:ChannelType.GuildVoice,
        parent:
          panel.category
            ? panel.category.replace(/\D/g, "") || undefined
            : undefined,
        permissionOverwrites
      });

  } else {

    channel =
      await guild.channels.create({
        name:`${cleanName}-${member.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/gi, "-")
          .slice(0, 100),
        type:ChannelType.GuildText,
        parent:
          panel.category
            ? panel.category.replace(/\D/g, "") || undefined
            : undefined,
        permissionOverwrites
      });

  }

  const ticket = {

    id:ticketId,

    guildId:guild.id,

    channelId:channel.id,

    userId:member.id,

    optionId:option.id,

    optionName:option.name,

    status:"open",

    claimedBy:null,

    createdAt:Date.now(),

    closedAt:null,

    closedBy:null

  };

  db.tickets[ticketId] = ticket;

  saveDB();

  client.tickets.set(
    ticketId,
    ticket
  );

  if (panel.ticketType === "voice") {

    const voiceEmbed =
      new EmbedBuilder()
        .setTitle("🔊 TICKET DE VOZ")
        .setDescription(
          `👋 Hola ${member}.\n\n` +
          `Bienvenido a NR TICKET.\n\n` +
          `Tu solicitud de **${option.name}** ha sido creada correctamente.\n\n` +
          `Un miembro del Staff te atenderá en breve.`
        )
        .setColor("#5865F2");

    const buttons =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId(
              `ticket_claim:${ticketId}`
            )
            .setLabel("🙋 Reclamar")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(
              `ticket_close:${ticketId}`
            )
            .setLabel("🔒 Cerrar")
            .setStyle(ButtonStyle.Danger)

        );

    await channel.send({
      content:`${member}`,
      embeds:[voiceEmbed],
      components:[buttons]
    });

  } else {

    const ticketEmbed =
      new EmbedBuilder()
        .setTitle("🎫 TICKET")
        .setDescription(
          `🤝 **Solicitud:** ${option.name}\n\n` +
          `👤 **Usuario:** ${member}\n\n` +
          `📊 **Estado:** ❌ Sin reclamar\n\n` +
          `Un miembro del Staff atenderá tu solicitud.`
        )
        .setColor("#5865F2");

    const buttons =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId(
              `ticket_claim:${ticketId}`
            )
            .setLabel("🙋 Reclamar")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(
              `ticket_close:${ticketId}`
            )
            .setLabel("🔒 Cerrar")
            .setStyle(ButtonStyle.Danger)

        );

    await channel.send({
      content:`${member}`,
      embeds:[ticketEmbed],
      components:[buttons]
    });

  }

  if (
    panel.transactions.dm ||
    panel.transactions.dmLogs
  ) {

    await member.send(
      `✅ Tu ticket ha sido creado correctamente.\n\n` +
      `🎫 **${option.name}**\n` +
      `📍 ${channel}`
    ).catch(() => {});

  }

  await interaction.reply({
    content:
      `✅ Tu ticket ha sido creado correctamente.\n${channel}`,
    ephemeral:true
  });

  await sendLog(
    guild,
    panel,
    "🎫 Ticket creado",
    [
      `👤 Usuario: ${member}`,
      `📌 Tipo: ${option.name}`,
      `📍 Canal: ${channel}`
    ]
  );

}

/* =========================================================
   RECLAMAR TICKET
========================================================= */

async function claimTicket(interaction, ticket) {

  if (ticket.status !== "open") {

    return interaction.reply({
      content:"❌ Este ticket ya está cerrado.",
      ephemeral:true
    });

  }

  if (ticket.claimedBy) {

    return interaction.reply({
      content:
        `⚠️ Este ticket ya fue reclamado por <@${ticket.claimedBy}>.`,
      ephemeral:true
    });

  }

  ticket.claimedBy =
    interaction.user.id;

  saveDB();

  const embed =
    new EmbedBuilder()
      .setTitle("🎫 TICKET")
      .setDescription(
        `🤝 **Solicitud:** ${ticket.optionName}\n\n` +
        `👤 **Usuario:** <@${ticket.userId}>\n\n` +
        `📊 **Estado:** 🟢 Reclamado\n\n` +
        `👮 **Staff:** ${interaction.user}`
      )
      .setColor("#48e18a");

  const buttons =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            `ticket_close:${ticket.id}`
          )
          .setLabel("🔒 Cerrar")
          .setStyle(ButtonStyle.Danger)

      );

  await interaction.update({
    embeds:[embed],
    components:[buttons]
  });

  const user =
    await client.users
      .fetch(ticket.userId)
      .catch(() => null);

  if (user) {

    await user.send(
      `👮 Tu ticket ha sido reclamado por ${interaction.user}.`
    ).catch(() => {});

  }

  const panel =
    Object.values(db.panels)
      .find(p =>
        p.guildId === ticket.guildId &&
        p.options.some(
          o => o.id === ticket.optionId
        )
      );

  await sendLog(
    interaction.guild,
    panel,
    "👮 Ticket reclamado",
    [
      `👤 Usuario: <@${ticket.userId}>`,
      `👮 Staff: ${interaction.user}`
    ]
  );

}

/* =========================================================
   CERRAR TICKET
========================================================= */

async function closeTicket(interaction, ticket) {

  const modal =
    new ModalBuilder()
      .setCustomId(
        `close_modal:${ticket.id}`
      )
      .setTitle("🔒 Cerrar ticket");

  const reason =
    new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Motivo del cierre")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        "Escribe el motivo del cierre..."
      )
      .setRequired(false)
      .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(reason)
  );

  await interaction.showModal(modal);
}

/* =========================================================
   LOGS
========================================================= */

async function sendLog(
  guild,
  panel,
  title,
  lines = []
) {

  try {

    if (!panel) return;

    let channel = null;

    if (panel.logsChannel) {

      const channelId =
        panel.logsChannel.replace(/\D/g, "");

      if (channelId) {
        channel =
          await guild.channels
            .fetch(channelId)
            .catch(() => null);
      }

    }

    if (!channel) {

      const config =
        getGuildConfig(guild.id);

      if (config.logsChannel) {

        channel =
          await guild.channels
            .fetch(config.logsChannel)
            .catch(() => null);

      }

    }

    if (!channel) return;

    const embed =
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(
          lines.join("\n")
        )
        .setColor("#5865F2")
        .setTimestamp();

    await channel.send({
      embeds:[embed]
    });

  } catch(error) {

    console.error(
      "❌ Error enviando log:",
      error
    );

  }

}

/* =========================================================
   INTERACCIONES
========================================================= */

client.on("interactionCreate", async interaction => {

  try {

    if (
      interaction.isButton()
    ) {

      const [action, ...parts] =
        interaction.customId.split(":");

      if (
        action === "ticket_button"
      ) {

        const panelId = parts[0];
        const optionId = parts[1];

        const panel =
          db.panels[panelId];

        if (!panel) {

          return interaction.reply({
            content:
              "❌ Este panel ya no existe.",
            ephemeral:true
          });

        }

        const option =
          panel.options.find(
            o => o.id === optionId
          );

        if (!option) {

          return interaction.reply({
            content:
              "❌ Esta opción ya no existe.",
            ephemeral:true
          });

        }

        return createTicket(
          interaction,
          panel,
          option
        );

      }

      if (
        action === "ticket_claim"
      ) {

        const ticket =
          db.tickets[parts[0]];

        if (!ticket) {

          return interaction.reply({
            content:"❌ Ticket no encontrado.",
            ephemeral:true
          });

        }

        return claimTicket(
          interaction,
          ticket
        );

      }

      if (
        action === "ticket_close"
      ) {

        const ticket =
          db.tickets[parts[0]];

        if (!ticket) {

          return interaction.reply({
            content:"❌ Ticket no encontrado.",
            ephemeral:true
          });

        }

        return closeTicket(
          interaction,
          ticket
        );

      }

    }

    if (
      interaction.isStringSelectMenu()
    ) {

      if (
        interaction.customId.startsWith(
          "ticket_select:"
        )
      ) {

        const panelId =
          interaction.customId.split(":")[1];

        const panel =
          db.panels[panelId];

        if (!panel) {

          return interaction.reply({
            content:
              "❌ Este panel ya no existe.",
            ephemeral:true
          });

        }

        const optionId =
          interaction.values[0];

        const option =
          panel.options.find(
            o => o.id === optionId
          );

        if (!option) {

          return interaction.reply({
            content:
              "❌ Opción no encontrada.",
            ephemeral:true
          });

        }

        return createTicket(
          interaction,
          panel,
          option
        );

      }

    }

    if (
      interaction.isModalSubmit()
    ) {

      if (
        interaction.customId.startsWith(
          "close_modal:"
        )
      ) {

        const ticketId =
          interaction.customId.split(":")[1];

        const ticket =
          db.tickets[ticketId];

        if (!ticket) {

          return interaction.reply({
            content:
              "❌ Ticket no encontrado.",
            ephemeral:true
          });

        }

        const reason =
          interaction.fields
            .getTextInputValue("reason")
            .trim() ||
          "Sin motivo especificado.";

        ticket.status =
          "closed";

        ticket.closedAt =
          Date.now();

        ticket.closedBy =
          interaction.user.id;

        ticket.closeReason =
          reason;

        saveDB();

        await interaction.reply({
          embeds:[
            new EmbedBuilder()
              .setTitle("🔒 TICKET CERRADO")
              .setDescription(
                `🎫 **${ticket.optionName}**\n\n` +
                `👤 **Usuario:** <@${ticket.userId}>\n` +
                `👮 **Cerrado por:** ${interaction.user}\n\n` +
                `📝 **Motivo:**\n${reason}`
              )
              .setColor("#ff5c6c")
          ]
        });

        const panel =
          Object.values(db.panels)
            .find(p =>
              p.guildId === ticket.guildId &&
              p.options.some(
                o => o.id === ticket.optionId
              )
            );

        await sendLog(
          interaction.guild,
          panel,
          "🔒 Ticket cerrado",
          [
            `🎫 Ticket: ${ticket.optionName}`,
            `👤 Usuario: <@${ticket.userId}>`,
            `👮 Staff: ${interaction.user}`,
            `📝 Motivo: ${reason}`
          ]
        );

        const user =
          await client.users
            .fetch(ticket.userId)
            .catch(() => null);

        if (user) {

          await user.send(
            `🔒 Tu ticket ha sido cerrado por ${interaction.user}.\n\n` +
            `📝 Motivo: ${reason}`
          ).catch(() => {});

        }

        setTimeout(
          async () => {

            const channel =
              interaction.guild.channels.cache.get(
                ticket.channelId
              );

            if (channel) {

              await channel.delete(
                "Ticket cerrado"
              ).catch(() => {});

            }

          },
          5000
        );

      }

    }

  } catch(error) {

    console.error(
      "❌ Error en interacción:",
      error
    );

    if (!interaction.replied &&
        !interaction.deferred) {

      await interaction.reply({
        content:
          "❌ Ocurrió un error procesando esta acción.",
        ephemeral:true
      }).catch(() => {});

    }

  }

});

/* =========================================================
   LOGIN
========================================================= */

client.once("ready", async () => {

  console.log(
    `✅ NR TICKET conectado como ${client.user.tag}`
  );

  console.log(
    `🌐 Dashboard: http://localhost:${PORT}`
  );

});

/* =========================================================
   SERVIDOR WEB
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `🌐 NR TICKET Dashboard iniciado en puerto ${PORT}`
    );

  }
);

/* =========================================================
   LOGIN DISCORD
========================================================= */

client.login(TOKEN);
