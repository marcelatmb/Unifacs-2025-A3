const fs = require('fs/promises');
const path = require('path');
const STATUS_VALIDOS = ['Pendente', 'Confirmada', 'Cancelada'];

//cria a tabela das mesas ja pensando em adicionar mais coisas depois
async function criarTabelaMesas(db) {
    const sql = `
        CREATE TABLE IF NOT EXISTS mesas (
            numero_mesa INTEGER PRIMARY KEY
            -- capacidade INTEGER,
            -- localizacao TEXT
        );
    `;
    await db.exec(sql);
    console.log("Tabela 'mesas' criada com sucesso.");
}

//coloca as mesas de 1 a 10 no banco de dados
async function inserirMesasPadrao(db) {
    const numeros = Array.from({ length: 10 }, (_, i) => i + 1);
    for (const numero of numeros) {
        await db.run(`INSERT OR IGNORE INTO mesas (numero_mesa) VALUES (?)`, [numero]);
    }
    console.log("Mesas padrão inseridas.");
}

//cria a tabela das reservas e liga ela com a tabela de mesas
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
            garcom TEXT,
            FOREIGN KEY (numero_mesa) REFERENCES mesas(numero_mesa)
        );
    `;
    await db.exec(sql);
    console.log("Tabela 'reservas' criada com sucesso.");
}

//adiciona uma nova reserva conferindo se o status ta certo e se a mesa existe
async function inserirReserva(db, data, hora, numeroMesa, qtdPessoas, nomeResponsavel, status, garcom) {
    if (!STATUS_VALIDOS.includes(status)) {
        throw new Error(`Status inválido: ${status}. Use apenas: ${STATUS_VALIDOS.join(', ')}`);
    }

    //confere no banco se a mesa que a pessoa quer reservar ta cadastrada
    const mesaExiste = await db.get(`SELECT 1 FROM mesas WHERE numero_mesa = ?`, [numeroMesa]);
    if (!mesaExiste) {
        throw new Error(`Mesa inválida: ${numeroMesa}.`);
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
        console.log("Nenhuma reserva encontrada no período especificado.");
        return;
    }
    // Relatório de reservas por perído no console
    console.log(`\n--- Relatório de Reservas de ${dataInicio} a ${dataFim} ---`);
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Data: ${row.data}, Hora: ${row.hora}, Mesa: ${row.numero_mesa}, Pessoas: ${row.qtd_pessoas}, Responsável: ${row.nome_responsavel}, Status: ${row.status}, Garçom: ${row.garcom || 'N/A'}`);
    });
    console.log(`Total de reservas encontradas: ${rows.length}`);
    console.log(`--------------------------------------------------------\n`);

    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();
    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);

    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por período (${dataInicio} a ${dataFim})\n--------------------\n`;
    for (const row of rows) {
        logEntry += `ID: ${row.id}\nData: ${row.data}\nHora: ${row.hora}\nMesa: ${row.numero_mesa}\nPessoas: ${row.qtd_pessoas}\nResponsável: ${row.nome_responsavel}\nStatus: ${row.status}\nGarçom: ${row.garcom || 'N/A'}\n-----------------------\n`;
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
        console.log(`\x1b[33m[Reservas]\x1b[0m Nenhuma reserva encontrada para a mesa ${numero_mesa}.`);
        return [];
    }

    // Relatório de reservas por mesa no console
    console.log(`\n--- Relatório de Reservas da mesa número ${numero_mesa} ---`);
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Data: ${row.data}, Hora: ${row.hora}, Mesa: ${row.numero_mesa}, Pessoas: ${row.qtd_pessoas}, Responsável: ${row.nome_responsavel}, Status: ${row.status}, Garçom: ${row.garcom || 'N/A'}`);
    });
    console.log(`Total de reservas encontradas: ${rows.length}`);
    console.log(`-----------------------------------------------\n`);

    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();
    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);
    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por mesa (${numero_mesa})\n--------------------\n`;
    for (const row of rows) {
        logEntry += `ID: ${row.id}\nData: ${row.data}\nHora: ${row.hora}\nMesa: ${row.numero_mesa}\nPessoas: ${row.qtd_pessoas}\nResponsável: ${row.nome_responsavel}\nStatus: ${row.status}\nGarçom: ${row.garcom || 'N/A'}\n-----------------------\n`;
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
        console.log(`Nenhuma mesa encontrada com status mais recente: ${status}`);
        return [];
    }

    // Relatório de reservas por status no console:
    console.log(`\n--- Mesas com status ${status} ---`);
    rows.forEach(row => {
        console.log(`Mesa: ${row.numero_mesa}, Status: ${row.status}`);
    });
    console.log(`Total de mesas encontradas: ${rows.length}`);
    console.log("----------------------------------\n");

    // Relatório de reservas por status no log:
    const now = new Date();
    const dataHoje = now.toISOString().slice(0, 10);
    const horaAgora = now.toLocaleTimeString();
    const logDir = path.join(__dirname, 'logs');
    const logPath = path.join(logDir, `relatorio_${dataHoje}.log`);
    await fs.mkdir(logDir, { recursive: true });

    let logEntry = `\n====================\n${dataHoje} ${horaAgora}\nTipo: Consulta por status (${status})\n--------------------\n`;
    for (const row of rows) {
        logEntry += `Mesa: ${row.numero_mesa}\nStatus: ${row.status}\n-----------------------\n`;
    }
    logEntry += `Total de mesas encontradas: ${rows.length}\n=======================\n`;
    await fs.appendFile(logPath, logEntry, 'utf8');
    console.log(`\x1b[32m[Reservas]\x1b[0m Relatório atualizado: ${logPath}`);

    return rows;
}

module.exports = {
    criarTabelaMesas,
    inserirMesasPadrao,
    criarTabelaReservas,
    inserirReserva,
    confirmarReserva,
    cancelarReserva,
    obterReservasPorPeriodo,
    obterReservasPorMesa,
    obterMesasPorStatus
};
