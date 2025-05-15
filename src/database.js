const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs/promises');
const path = require('path');

async function abrirConexao() {
    const dbDir = path.join(__dirname, 'db');
    await fs.mkdir(dbDir, { recursive: true });

    return open({
        filename: path.join(dbDir, 'reservas.db'),
        driver: sqlite3.Database
    });
}

module.exports = { abrirConexao };