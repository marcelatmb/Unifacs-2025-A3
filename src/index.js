const { abrirConexao } = require('./database');
const express = require('express');
const rotasApi = require('./reservasRoutes');
const {criarTabelaReservas} = require('./reservaService');

const PORT = 3000;

(async () => {
    try {
        const db = await abrirConexao();
        await criarTabelaReservas(db);

        const app = express();

        app.use(express.json())

         // Middleware para disponibilizar a conexão no req
        app.use((req, res, next) => {
            req.db = db;
            next();
        });

        // Usa o router das rotas
        app.use('/reservas', rotasApi);

        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });

        // Exemplos de uso
        // await inserirReserva(db, "2024-07-20", "19:00", 5, 4, "João Silva", "Confirmada", "Maria");
        // await inserirReserva(db, "2024-07-22", "20:30", 12, 6, "Ana Oliveira", "Pendente", null);
        // await inserirReserva(db, "2024-07-23", "18:45", 3, 2, "Carlos Mendes", "Pendente", null);
        // await inserirReserva(db, "2024-07-24", "21:00", 8, 5, "Fernanda Costa", "Confirmada", "Paulo");
        // await confirmarReserva(db, 2);
        // await obterReservasPorPeriodo(db, "2024-07-22", "2024-07-23");

        //await db.close();
    } catch (err) {
        console.error("Erro:", err.message);
    }
})();