require('dotenv').config(); // Carrega as variáveis do arquivo .env

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do banco usando variáveis de ambiente
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection()
    .then(connection => {
        console.log('==========================================');
        console.log('MySQL conectado com sucesso!');
        console.log(`Banco: ${process.env.DB_NAME}`);
        console.log('==========================================');

        connection.release();
    })
    .catch(error => {
        console.log('==========================================');
        console.log('ERRO AO CONECTAR AO MYSQL');
        console.log(error.message);
        console.log('==========================================');
    });

function pegarUsuarioId(req) {
    let usuarioId =
        req.params.usuarioId ||
        req.query.usuarioId ||
        req.body.usuarioId ||
        req.headers['x-user-id'];

    if (!usuarioId) {
        return null;
    }

    usuarioId = parseInt(usuarioId, 10);

    if (isNaN(usuarioId)) {
        return null;
    }

    return usuarioId;
}

async function usuarioExiste(usuarioId) {
    const [rows] = await db.query(
        `
        SELECT id
        FROM usuarios
        WHERE id = ?
        `,
        [usuarioId]
    );

    return rows.length > 0;
}

function verificarSenhaWerkzeug(senha, hash) {
    try {
        if (!hash || !hash.startsWith('scrypt:')) {
            return false;
        }

        const partes = hash.split('$');

        if (partes.length !== 3) {
            return false;
        }

        const configuracao = partes[0];
        const salt = partes[1];
        const hashEsperado = partes[2];

        const valores = configuracao.split(':');

        if (valores.length !== 4) {
            return false;
        }

        const algoritmo = valores[0];

        if (algoritmo !== 'scrypt') {
            return false;
        }

        const N = parseInt(valores[1], 10);
        const r = parseInt(valores[2], 10);
        const p = parseInt(valores[3], 10);

        const hashCalculado = crypto.scryptSync(
            senha,
            salt,
            64,
            {
                N: N,
                r: r,
                p: p,
                maxmem: 64 * 1024 * 1024
            }
        );

        const hashCalculadoHex =
            hashCalculado.toString('hex');

        return hashCalculadoHex === hashEsperado;

    } catch (error) {
        console.log(
            'ERRO AO VERIFICAR SENHA:',
            error.message
        );

        return false;
    }
}

app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'API do IC Agrícola funcionando!'
    });
});

app.post('/api/login', async (req, res) => {
    console.log('Corpo recebido:', {
        email: req.body?.email,
        camposRecebidos: Object.keys(req.body || {}),
        tipoSenha: typeof req.body?.senha
    });

    const { email, senha } = req.body || {};

    if (
        typeof email !== 'string' ||
        typeof senha !== 'string' ||
        !email.trim() ||
        !senha
    ) {
        return res.status(400).json({
            success: false,
            message: 'Preencha e-mail e senha.',
            camposRecebidos: Object.keys(req.body || {})
        });
    }

    try {
        const [rows] = await db.query(
            `
            SELECT id, usuario, email, senha
            FROM usuarios
            WHERE email = ?
            `,
            [email.trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha incorretos.'
            });
        }

        const usuario = rows[0];

        const senhaCorreta = verificarSenhaWerkzeug(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha incorretos.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso!',
            user: {
                id: usuario.id,
                usuario: usuario.usuario,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('ERRO NO LOGIN:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Erro ao realizar login.'
        });
    }
});

app.get(
    '/api/dashboard/:usuarioId',
    async (req, res) => {
        const usuarioId =
            pegarUsuarioId(req);

        if (!usuarioId) {
            return res.status(400).json({
                message: 'Usuário inválido.'
            });
        }

        try {
            const [
                totalProdutos
            ] = await db.query(
                `
                SELECT
                    COUNT(*) AS totalProducts
                FROM produto
                WHERE usuario_id = ?
                `,
                [usuarioId]
            );

            const [
                estoqueBaixo
            ] = await db.query(
                `
                SELECT
                    COUNT(*) AS lowStockCount
                FROM produto
                WHERE usuario_id = ?
                  AND quantidade <= 10
                `,
                [usuarioId]
            );

            const [
                quantidadeTotal
            ] = await db.query(
                `
                SELECT
                    COALESCE(
                        SUM(quantidade),
                        0
                    ) AS totalQuantity
                FROM produto
                WHERE usuario_id = ?
                `,
                [usuarioId]
            );

            const [
                valorTotal
            ] = await db.query(
                `
                SELECT
                    COALESCE(
                        SUM(
                            quantidade *
                            preco_unitario
                        ),
                        0
                    ) AS totalValue
                FROM produto
                WHERE usuario_id = ?
                `,
                [usuarioId]
            );

            const [
                atividades
            ] = await db.query(
                `
                SELECT
                    id,
                    produto,
                    quantidade,
                    data,
                    tipo
                FROM (
                    SELECT
                        CONCAT('entrada-', e.id) AS id,
                        p.nome AS produto,
                        e.quantidade AS quantidade,
                        e.data_movimentacao AS data,
                        'Entrada' AS tipo
                    FROM entrada_estoque e
                    INNER JOIN produto p ON p.id = e.produto_id
                    WHERE p.usuario_id = ?
                    UNION ALL
                    SELECT
                        CONCAT('saida-', s.id) AS id,
                        p.nome AS produto,
                        s.quantidade AS quantidade,
                        s.data_movimentacao AS data,
                        'Saída' AS tipo
                    FROM saida_estoque s
                    INNER JOIN produto p ON p.id = s.produto_id
                    WHERE p.usuario_id = ?
                ) AS combinada
                ORDER BY data DESC
                LIMIT 5;
                `,
                [usuarioId, usuarioId]
            );

            return res.status(200).json({
                totalProducts: totalProdutos[0].totalProducts,
                lowStockCount: estoqueBaixo[0].lowStockCount,
                totalQuantity: quantidadeTotal[0].totalQuantity,
                totalValue: valorTotal[0].totalValue,
                recentActivities: atividades
            });

        } catch (error) {
            console.error('ERRO NO DASHBOARD:', error.message);
            return res.status(500).json({
                message: 'Erro ao carregar dados do dashboard.'
            });
        }
    }
);

// Define a porta usando o .env ou assume a 3000 por segurança
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
