const fs = require('fs/promises');
const path = require('path');

async function criarTabelaReservas(db) {
    const sql = `
        CREATE TABLE IF NOT EXISTS reservas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            hora TEXT NOT NULL,
            numero_mesa INTEGER NOT NULL,
            qtd_pessoas INTEGER NOT NULL,
            nome_responsavel TEXT NOT NULL,
            status TEXT NOT NULL,
            garcom TEXT
        );
    `;
    await db.exec(sql);
    console.log("Tabela 'reservas' criada com sucesso.");
}

async function inserirReserva(db, data, hora, numeroMesa, qtdPessoas, nomeResponsavel, status, garcom) {
    const sql = `
        INSERT INTO reservas (data, hora, numero_mesa, qtd_pessoas, nome_responsavel, status, garcom)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.run(sql, [data, hora, numeroMesa, qtdPessoas, nomeResponsavel, status, garcom]);
    console.log(`Reserva inserida com ID: ${result.lastID}`);
}

async function confirmarReserva(db, idReserva) {
    if (!idReserva || typeof idReserva !== 'number') {
        console.error("ID inválido para confirmação de reserva.");
        return;
    }

    const result = await db.run(`UPDATE reservas SET status = 'Confirmada' WHERE id = ?`, [idReserva]);

    if (result.changes === 0) {
        console.log(`Nenhuma reserva encontrada com ID: ${idReserva}`);
    } else {
        console.log(`Reserva ID ${idReserva} confirmada.`);
    }
}

async function obterReservasPorPeriodo(db, dataInicio, dataFim) {
    const sql = `SELECT * FROM reservas WHERE data BETWEEN ? AND ?`;
    const rows = await db.all(sql, [dataInicio, dataFim]);

    if (rows.length === 0) {
        console.log("Nenhuma reserva encontrada no período especificado.");
        return;
    }

    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();

    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);

    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por período\n--------------------\n`;

    for (const row of rows) {
        logEntry += `ID: ${row.id}\n`;
        logEntry += `Data: ${row.data}\n`;
        logEntry += `Hora: ${row.hora}\n`;
        logEntry += `Mesa: ${row.numero_mesa}\n`;
        logEntry += `Pessoas: ${row.qtd_pessoas}\n`;
        logEntry += `Responsável: ${row.nome_responsavel}\n`;
        logEntry += `Status: ${row.status}\n`;
        logEntry += `Garçom: ${row.garcom || 'N/A'}\n`;
        logEntry += `-----------------------\n`;
    }

    logEntry += `Total de reservas encontradas: ${rows.length}\n=======================\n`;

    await fs.appendFile(logPath, logEntry, 'utf8');
    console.log(`Relatório atualizado: ${logPath}`);
}

module.exports = {
    criarTabelaReservas,
    inserirReserva,
    confirmarReserva,
    obterReservasPorPeriodo
};