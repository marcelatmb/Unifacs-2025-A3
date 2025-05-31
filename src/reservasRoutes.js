const express = require("express");
const service = require("./reservaService");

const app = express();
const PORT = 3000;

// Middleware para tratar informações recebidas
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Bem-vindo ao restaurante!');
});

// CREATE - Cria uma nova reserva
app.post('/reservas', async (req, res) => {
    try {
        const novaReserva = await service.inserirReserva(req.body);
        res.json(novaReserva);
    } catch (error) {
        res.json({error: error});
    }
});


// READ - Consultar relatórios
app.get('/reservas', async (req, res) => {
    try {
        const obterReservas = await service.obterReservasPorPeriodo(req.query);
        res.json(obterReservas)
    } catch (error) {
        res.json({error: error})
    }
});

// UPDATE - Confirmar uma reserva

app.put('/reservas/:idReserva', async (req, res) => {
    try {
        const confirmarReserva = await service.confirmarReserva(req.params.idReserva);
    } catch (error) {
        res.json({error: error})
    }
})

// UPDATE - Cancelar uma reserva

app.put('/reservas/:idReserva', async (req, res) => {
    try {
        const cancelarReserva = await service.cancelarReserva(req.params.idReserva)
    } catch (error) {
        res.json({error: error})
    }
})

app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}`));