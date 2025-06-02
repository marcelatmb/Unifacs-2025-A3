const express = require("express");
const service = require("./reservaService");

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Bem-vindo ao restaurante!');
});

// CREATE - Cria uma nova reserva
router.post('/', async (req, res) => {
    try {
        const { data, hora, numero_mesa, qtd_pessoas, nome_responsavel, status, garcom } = req.body;

        if (!data || !hora || !numero_mesa || !qtd_pessoas || !nome_responsavel || !status) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        await service.inserirReserva(
            req.db,
            data,
            hora,
            numero_mesa,
            qtd_pessoas,
            nome_responsavel,
            status,
            garcom
        );

        res.status(201).json({ message: 'Reserva criada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar reserva.' });
    }
});

// READ - Consultar relatórios por data
router.get('/relatorio', async (req, res) => {
    try {
        const { dataInicio, dataFim } = req.query;
        if (!dataInicio || !dataFim) {
            return res.status(400).json({ error: 'Informe a data inicial e a data final no formato YYYY-MM-DD.' });
        }
        
        reservas = await service.obterReservasPorPeriodo(req.db, dataInicio, dataFim);
        res.json({ message: 'Relatório gerado com sucesso!', reservas });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// READ - Consultar reservas pela mesa

router.get('/mesa/:numero_mesa', async (req, res) => {
    try {
        const numero_mesa = parseInt(req.params.numero_mesa, 10);
        if (isNaN(numero_mesa) || numero_mesa <= 0) {
            return res.status(400).json({ error: 'Número da mesa inválido.' });
        }
        reservas = await service.obterReservasPorMesa(req.db, numero_mesa);
        res.json({ message: 'Relatório gerado com sucesso! Verifique o diretório de logs.' }, reservas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// READ - Consultar mesas por status

router.get('/status/:status', async (req, res) => {
    try {
        const status = req.params.status;

        // Chamar a função correta
        const mesas = await service.obterMesasPorStatus(req.db, status);

        if (mesas.length === 0) {
            return res.status(404).json({ message: 'Nenhuma mesa encontrada com esse status.' });
        }

        res.json({ message: 'Relatório gerado com sucesso! Verifique o diretório de logs.' }, mesas);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar mesas por status.' });
    }
});


// UPDATE - Confirmar uma reserva
router.put('/confirmar/:idReserva', async (req, res) => {
    try {
        const idReserva = parseInt(req.params.idReserva, 10);

        if (isNaN(idReserva)) {
            return res.status(400).json({ error: 'ID de reserva inválido.' });
        }
        
        await service.confirmarReserva(req.db, idReserva);
        res.json({ message: 'Reserva confirmada com sucesso!' });

    } catch (error) {
        if (error.message === 'Reserva não encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro ao confirmar reserva.' });
    }
});

// UPDATE - Cancelar uma reserva
router.put('/cancelar/:idReserva', async (req, res) => {
    try {
        const idReserva = parseInt(req.params.idReserva, 10);

        if (isNaN(idReserva)) {
            return res.status(400).json({ error: 'ID de reserva inválido.' });
        }

        await service.cancelarReserva(req.db, idReserva);
        res.json({ message: 'Reserva cancelada com sucesso!' });
    } catch (error) {
        if (error.message === 'Reserva não encontrada') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro ao cancelar reserva.' });
    }
});

module.exports = router;
