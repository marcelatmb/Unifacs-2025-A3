const fs = require('fs/promises');
const path = require('path');

const STATUS_VALIDOS = ['Pendente', 'Confirmada', 'Cancelada'];

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
    if (!STATUS_VALIDOS.includes(status)) {
        throw new Error(`Status inválido: ${status}. Use apenas: ${STATUS_VALIDOS.join(', ')}`);
    }

    const sqlVerifica = `
        SELECT * FROM reservas WHERE data = ? AND hora = ? AND numero_mesa = ? AND status != 'Cancelada'
    `;
    const conflito = await db.get(sqlVerifica, [data, hora, numeroMesa]);

    if (conflito) {
        throw new Error(`Já existe uma reserva para a mesa ${numeroMesa} neste horário.`);
    }

    const sql = `
        INSERT INTO reservas (data, hora, numero_mesa, qtd_pessoas, nome_responsavel, status, garcom)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.run(sql, [data, hora, numeroMesa, qtdPessoas, nomeResponsavel, status, garcom]);
    console.log(`Reserva inserida com ID: ${result.lastID}`);
}

async function confirmarReserva(db, idReserva) {
    const reserva = await db.get(`SELECT status FROM reservas WHERE id = ?`, [idReserva]);
    if (!reserva) throw new Error(`Reserva não encontrada.`);
    if (reserva.status !== 'Pendente') throw new Error(`Somente reservas pendentes podem ser confirmadas.`);

    await db.run(`UPDATE reservas SET status = 'Confirmada' WHERE id = ?`, [idReserva]);
    console.log(`Reserva ID ${idReserva} confirmada.`);
}

async function cancelarReserva(db, idReserva) {
    const reserva = await db.get(`SELECT status FROM reservas WHERE id = ?`, [idReserva]);
    if (!reserva) throw new Error(`Reserva não encontrada.`);
    if (reserva.status !== 'Pendente') throw new Error(`Somente reservas pendentes podem ser canceladas.`);

    await db.run(`UPDATE reservas SET status = 'Cancelada' WHERE id = ?`, [idReserva]);
    console.log(`Reserva ID ${idReserva} cancelada.`);
}

async function obterReservasPorPeriodo(db, dataInicio, dataFim) {
    const sql = `SELECT * FROM reservas WHERE data BETWEEN ? AND ?`;
    const rows = await db.all(sql, [dataInicio, dataFim]);

    if (rows.length === 0) {
        throw new Error("Nenhuma reserva encontrada no período especificado.");
    }

    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();
    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);
    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por período (${dataInicio} a ${dataFim})\n--------------------\n`;
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
    console.log(`\x1b[32m[Reservas]\x1b[0m Relatório atualizado: ${logPath}`);

    return rows;
}

async function obterReservasPorMesa(db, numero_mesa) {
    const sql = `SELECT * FROM reservas WHERE numero_mesa = ?`;
    const rows = await db.all(sql, [numero_mesa]);

    if (rows.length === 0) {
        throw new Error(`Nenhuma reserva encontrada para a mesa ${numero_mesa}.`);
    }

    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();
    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);
    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por mesa (${numero_mesa})\n--------------------\n`;
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
    console.log(`\x1b[32m[Reservas]\x1b[0m Relatório atualizado: ${logPath}`);

    return rows;
}

async function obterMesasPorStatus(db, status) {
    if (!STATUS_VALIDOS.includes(status)) {
        throw new Error(`Status inválido: ${status}. Use apenas: ${STATUS_VALIDOS.join(', ')}`);
    }

    const sql = `
        SELECT r1.numero_mesa, r1.status
        FROM reservas r1
        JOIN (
            SELECT numero_mesa, MAX(data || ' ' || hora) AS max_datetime
            FROM reservas
            GROUP BY numero_mesa
        ) r2
        ON r1.numero_mesa = r2.numero_mesa
        AND (r1.data || ' ' || r1.hora) = r2.max_datetime
        WHERE r1.status = ?;
    `;

    const rows = await db.all(sql, [status]);

    if (rows.length === 0) {
        throw new Error(`Nenhuma mesa encontrada com status mais recente: ${status}.`);
    }

    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();
    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);
    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por status (${status})\n--------------------\n`;
    for (const row of rows) {
        logEntry += `Mesa: ${row.numero_mesa}\n`;
        logEntry += `Status: ${row.status}\n`;
        logEntry += `-----------------------\n`;
    }
    logEntry += `Total de mesas encontradas: ${rows.length}\n=======================\n`;
    await fs.appendFile(logPath, logEntry, 'utf8');
    console.log(`\x1b[32m[Reservas]\x1b[0m Relatório atualizado: ${logPath}`);

    return rows;
}

module.exports = {
    criarTabelaReservas,
    inserirReserva,
    confirmarReserva,
    cancelarReserva,
    obterReservasPorPeriodo,
    obterReservasPorMesa,
    obterMesasPorStatus
};
