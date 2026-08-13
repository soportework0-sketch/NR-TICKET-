const fs = require("fs");
const path = require("path");

const DATABASE_DIR = path.join(__dirname, "..", "database");

const DEFAULT_FILES = {
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

/*
|--------------------------------------------------------------------------

Crear carpeta database
*/

function ensureDatabase() {
if (!fs.existsSync(DATABASE_DIR)) {
fs.mkdirSync(DATABASE_DIR, {
recursive: true
});
}

for (const [file, defaultData] of Object.entries(DEFAULT_FILES)) {
    const filePath = path.join(DATABASE_DIR, file);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
            filePath,
            JSON.stringify(defaultData, null, 4),
            "utf8"
        );
    }
}

}

/*
|--------------------------------------------------------------------------

Leer JSON
*/

function read(file) {
ensureDatabase();

const filePath = path.join(DATABASE_DIR, file);

if (!fs.existsSync(filePath)) {
    return null;
}

try {
    const content = fs.readFileSync(filePath, "utf8");

    if (!content.trim()) {
        return null;
    }

    return JSON.parse(content);
} catch (error) {
    console.error(
        `[NR TICKET] Error leyendo ${file}:`,
        error.message
    );

    return null;
}

}

/*
|--------------------------------------------------------------------------

Guardar JSON
*/

function write(file, data) {
ensureDatabase();

const filePath = path.join(DATABASE_DIR, file);

try {
    fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 4),
        "utf8"
    );

    return true;
} catch (error) {
    console.error(
        `[NR TICKET] Error guardando ${file}:`,
        error.message
    );

    return false;
}

}

/*
|--------------------------------------------------------------------------

Actualizar JSON
*/

function update(file, callback) {
const data = read(file);

const result = callback(data);

write(file, result);

return result;

}

/*
|--------------------------------------------------------------------------

Añadir elemento
*/

function push(file, item) {
const data = read(file);

if (!Array.isArray(data)) {
    throw new Error(
        `${file} no contiene un array.`
    );
}

data.push(item);

write(file, data);

return item;

}

/*
|--------------------------------------------------------------------------

Buscar elemento
*/

function find(file, callback) {
const data = read(file);

if (Array.isArray(data)) {
    return data.find(callback);
}

if (data && typeof data === "object") {
    return Object.values(data).find(callback);
}

return undefined;

}

/*
|--------------------------------------------------------------------------

Buscar todos
*/

function filter(file, callback) {
const data = read(file);

if (Array.isArray(data)) {
    return data.filter(callback);
}

if (data && typeof data === "object") {
    return Object.values(data).filter(callback);
}

return [];

}

/*
|--------------------------------------------------------------------------

Eliminar elemento
*/

function remove(file, callback) {
const data = read(file);

if (!Array.isArray(data)) {
    throw new Error(
        `${file} no contiene un array.`
    );
}

const filtered = data.filter(
    item => !callback(item)
);

write(file, filtered);

return filtered;

}

/*
|--------------------------------------------------------------------------

Inicializar database
*/

ensureDatabase();

/*
|--------------------------------------------------------------------------

Exportar
*/

module.exports = {
DATABASE_DIR,
ensureDatabase,
read,
write,
update,
push,
find,
filter,
remove
};
