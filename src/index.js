const { abrirConexao } = require('./database');
const express = require('express');
const rotasApi = require('./reservasRoutes');
const reservaService2 = require('./reservaService2');

const PORT = 3000;

(async () => {
    try {
        const db = await abrirConexao();
        await reservaService2.criarTabelaMesas(db);
        await reservaService2.inserirMesasPadrao(db);
        await reservaService2.criarTabelaReservas(db);

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

    } catch (err) {
        console.error("Erro:", err.message);
    }
})();
