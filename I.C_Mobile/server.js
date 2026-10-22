const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'estoque_agricola',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});



db.getConnection()
    .then(connection => {
        console.log('==========================================');
        console.log('MySQL conectado com sucesso!');
        console.log('Banco: estoque_agricola');
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

    // Validar os campos recebidos
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
        // Buscar usuário pelo e-mail
        const [rows] = await db.query(
            `
            SELECT id, usuario, email, senha
            FROM usuarios
            WHERE email = ?
            `,
            [email.trim()]
        );

        // Verificar se o usuário existe
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha incorretos.'
            });
        }

        const usuario = rows[0];

        // Verificar a senha armazenada no formato do Werkzeug
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

        // Login realizado
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


            // ==============================================
            // MOVIMENTAÇÕES RECENTES
            // ==============================================

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
                        CONCAT(
                            'entrada-',
                            e.id
                        ) AS id,

                        p.nome AS produto,

                        e.quantidade AS quantidade,

                        e.data_movimentacao AS data,

                        'Entrada' AS tipo

                    FROM entrada_estoque e

                    INNER JOIN produto p
                        ON p.id = e.produto_id

                    WHERE p.usuario_id = ?


                    UNION ALL


                    SELECT
                        CONCAT(
                            'saida-',
                            s.id
                        ) AS id,

                        p.nome AS produto,

                        s.quantidade AS quantidade,

                        s.data_movimentacao AS data,

                        'Saída' AS tipo

                    FROM saida_estoque s

                    INNER JOIN produto p
                        ON p.id = s.produto_id

                    WHERE p.usuario_id = ?

                ) AS atividades

                ORDER BY data DESC

                LIMIT 5
                `,
                [
                    usuarioId,
                    usuarioId
                ]
            );



            atividades.forEach(
                atividade => {

                    if (atividade.data) {

                        atividade.data =
                            new Date(
                                atividade.data
                            ).toLocaleString(
                                'pt-BR'
                            );

                    }

                }
            );


            return res.json({

                totalProducts:
                    totalProdutos[0].totalProducts || 0,

                lowStockCount:
                    estoqueBaixo[0].lowStockCount || 0,

                totalQuantity:
                    quantidadeTotal[0].totalQuantity || 0,

                totalValue:
                    valorTotal[0].totalValue || 0,

                recentActivities:
                    atividades

            });


        } catch (error) {

            console.log(
                'ERRO NO DASHBOARD:',
                error
            );

            return res.status(500).json({
                message: 'Erro ao carregar dashboard.',
                error: error.message
            });

        }

    }
);



app.get(
    '/api/products',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        if (!usuarioId) {

            return res.status(400).json({
                message: 'Informe o usuário.'
            });

        }

        try {

            const [
                produtos
            ] = await db.query(
                `
                SELECT
                    p.id,
                    p.nome,
                    p.quantidade,
                    p.preco_unitario,
                    p.usuario_id,
                    p.categoria_id,
                    c.nome AS categoria_nome

                FROM produto p

                LEFT JOIN categoria c
                    ON c.id = p.categoria_id

                WHERE p.usuario_id = ?

                ORDER BY p.nome ASC
                `,
                [usuarioId]
            );


            return res.json(produtos);

        } catch (error) {

            console.log(
                'ERRO AO LISTAR PRODUTOS:',
                error
            );

            return res.status(500).json({
                message: 'Erro ao carregar produtos.',
                error: error.message
            });

        }

    }
);



app.get(
    '/api/products/:id',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        const produtoId =
            parseInt(
                req.params.id,
                10
            );

        if (!usuarioId) {

            return res.status(400).json({
                message: 'Informe o usuário.'
            });

        }

        if (isNaN(produtoId)) {

            return res.status(400).json({
                message: 'Produto inválido.'
            });

        }

        try {

            const [
                rows
            ] = await db.query(
                `
                SELECT
                    p.id,
                    p.nome,
                    p.quantidade,
                    p.preco_unitario,
                    p.usuario_id,
                    p.categoria_id,
                    c.nome AS categoria_nome

                FROM produto p

                LEFT JOIN categoria c
                    ON c.id = p.categoria_id

                WHERE p.id = ?
                  AND p.usuario_id = ?
                `,
                [
                    produtoId,
                    usuarioId
                ]
            );


            if (rows.length === 0) {

                return res.status(404).json({
                    message: 'Produto não encontrado.'
                });

            }


            return res.json(rows[0]);

        } catch (error) {

            return res.status(500).json({
                message: 'Erro ao buscar produto.',
                error: error.message
            });

        }

    }
);



app.post(
    '/api/products',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        const {
            nome,
            preco_unitario,
            categoria_id
        } = req.body;


        if (!usuarioId) {

            return res.status(400).json({
                message: 'Usuário inválido.'
            });

        }

        if (!nome || preco_unitario === undefined) {

            return res.status(400).json({
                message: 'Informe nome e preço.'
            });

        }


        const preco =
            parseFloat(
                String(preco_unitario)
                    .replace(',', '.')
            );


        if (isNaN(preco) || preco < 0) {

            return res.status(400).json({
                message: 'Preço inválido.'
            });

        }


        try {


            if (categoria_id) {

                const [
                    categoria
                ] = await db.query(
                    `
                    SELECT id
                    FROM categoria
                    WHERE id = ?
                      AND usuario_id = ?
                    `,
                    [
                        categoria_id,
                        usuarioId
                    ]
                );


                if (categoria.length === 0) {

                    return res.status(400).json({
                        message: 'Categoria inválida.'
                    });

                }

            }


            const [
                resultado
            ] = await db.query(
                `
                INSERT INTO produto
                (
                    nome,
                    quantidade,
                    preco_unitario,
                    usuario_id,
                    categoria_id
                )
                VALUES
                (
                    ?,
                    0,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    nome.trim(),
                    preco,
                    usuarioId,
                    categoria_id || null
                ]
            );


            return res.status(201).json({

                success: true,

                message:
                    'Produto cadastrado com sucesso!',

                id:
                    resultado.insertId

            });


        } catch (error) {

            console.log(
                'ERRO AO CADASTRAR PRODUTO:',
                error
            );

            return res.status(500).json({
                message: 'Erro ao cadastrar produto.',
                error: error.message
            });

        }

    }
);



app.put(
    '/api/products/:id',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        const produtoId =
            parseInt(
                req.params.id,
                10
            );

        const {
            nome,
            preco_unitario,
            categoria_id
        } = req.body;


        if (!usuarioId) {

            return res.status(400).json({
                message: 'Usuário inválido.'
            });

        }


        if (isNaN(produtoId)) {

            return res.status(400).json({
                message: 'Produto inválido.'
            });

        }


        if (!nome || preco_unitario === undefined) {

            return res.status(400).json({
                message: 'Informe nome e preço.'
            });

        }


        const preco =
            parseFloat(
                String(preco_unitario)
                    .replace(',', '.')
            );


        if (isNaN(preco) || preco < 0) {

            return res.status(400).json({
                message: 'Preço inválido.'
            });

        }


        try {


            const [
                produto
            ] = await db.query(
                `
                SELECT id
                FROM produto
                WHERE id = ?
                  AND usuario_id = ?
                `,
                [
                    produtoId,
                    usuarioId
                ]
            );


            if (produto.length === 0) {

                return res.status(404).json({
                    message: 'Produto não encontrado.'
                });

            }



            if (categoria_id) {

                const [
                    categoria
                ] = await db.query(
                    `
                    SELECT id
                    FROM categoria
                    WHERE id = ?
                      AND usuario_id = ?
                    `,
                    [
                        categoria_id,
                        usuarioId
                    ]
                );


                if (categoria.length === 0) {

                    return res.status(400).json({
                        message: 'Categoria inválida.'
                    });

                }

            }



            await db.query(
                `
                UPDATE produto

                SET
                    nome = ?,
                    preco_unitario = ?,
                    categoria_id = ?

                WHERE id = ?
                  AND usuario_id = ?
                `,
                [
                    nome.trim(),
                    preco,
                    categoria_id || null,
                    produtoId,
                    usuarioId
                ]
            );


            return res.json({

                success: true,

                message:
                    'Produto atualizado com sucesso!'

            });


        } catch (error) {

            console.log(
                'ERRO AO ATUALIZAR PRODUTO:',
                error
            );

            return res.status(500).json({
                message: 'Erro ao atualizar produto.',
                error: error.message
            });

        }

    }
);



app.delete(
    '/api/products/:id',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        const produtoId =
            parseInt(
                req.params.id,
                10
            );


        if (!usuarioId) {

            return res.status(400).json({
                message: 'Usuário inválido.'
            });

        }


        if (isNaN(produtoId)) {

            return res.status(400).json({
                message: 'Produto inválido.'
            });

        }


        const connection =
            await db.getConnection();


        try {

            await connection.beginTransaction();


            const [
                produto
            ] = await connection.query(
                `
                SELECT id
                FROM produto
                WHERE id = ?
                  AND usuario_id = ?
                `,
                [
                    produtoId,
                    usuarioId
                ]
            );


            if (produto.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    message: 'Produto não encontrado.'
                });

            }



            await connection.query(
                `
                DELETE FROM entrada_estoque
                WHERE produto_id = ?
                `,
                [produtoId]
            );



            await connection.query(
                `
                DELETE FROM saida_estoque
                WHERE produto_id = ?
                `,
                [produtoId]
            );



            await connection.query(
                `
                DELETE FROM produto
                WHERE id = ?
                  AND usuario_id = ?
                `,
                [
                    produtoId,
                    usuarioId
                ]
            );


            await connection.commit();


            return res.json({

                success: true,

                message:
                    'Produto excluído com sucesso!'

            });


        } catch (error) {

            await connection.rollback();

            console.log(
                'ERRO AO EXCLUIR PRODUTO:',
                error
            );

            return res.status(500).json({
                message: 'Erro ao excluir produto.',
                error: error.message
            });

        } finally {

            connection.release();

        }

    }
);


app.post(
    '/api/stock/entry',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        const {
            productId,
            quantity
        } = req.body;


        const produtoId =
            parseInt(
                productId,
                10
            );

        const quantidade =
            parseInt(
                quantity,
                10
            );


        if (!usuarioId) {

            return res.status(400).json({
                message: 'Usuário inválido.'
            });

        }


        if (
            isNaN(produtoId) ||
            isNaN(quantidade) ||
            quantidade <= 0
        ) {

            return res.status(400).json({
                message:
                    'Informe produto e quantidade válidos.'
            });

        }


        const connection =
            await db.getConnection();


        try {

            await connection.beginTransaction();



            const [
                produtos
            ] = await connection.query(
                `
                SELECT
                    id,
                    nome,
                    quantidade

                FROM produto

                WHERE id = ?
                  AND usuario_id = ?

                FOR UPDATE
                `,
                [
                    produtoId,
                    usuarioId
                ]
            );


            if (produtos.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    message:
                        'Produto não encontrado.'
                });

            }



            await connection.query(
                `
                INSERT INTO entrada_estoque
                (
                    produto_id,
                    quantidade
                )
                VALUES
                (
                    ?,
                    ?
                )
                `,
                [
                    produtoId,
                    quantidade
                ]
            );



            await connection.query(
                `
                UPDATE produto

                SET quantidade =
                    quantidade + ?

                WHERE id = ?
                  AND usuario_id = ?
                `,
                [
                    quantidade,
                    produtoId,
                    usuarioId
                ]
            );


            await connection.commit();


            return res.json({

                success: true,

                message:
                    'Entrada registrada com sucesso!'

            });


        } catch (error) {

            await connection.rollback();

            console.log(
                'ERRO NA ENTRADA:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao registrar entrada.',
                error:
                    error.message
            });

        } finally {

            connection.release();

        }

    }
);



app.post(
    '/api/stock/exit',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);

        const {
            productId,
            quantity
        } = req.body;


        const produtoId =
            parseInt(
                productId,
                10
            );

        const quantidade =
            parseInt(
                quantity,
                10
            );


        if (!usuarioId) {

            return res.status(400).json({
                message: 'Usuário inválido.'
            });

        }


        if (
            isNaN(produtoId) ||
            isNaN(quantidade) ||
            quantidade <= 0
        ) {

            return res.status(400).json({
                message:
                    'Informe produto e quantidade válidos.'
            });

        }


        const connection =
            await db.getConnection();


        try {

            await connection.beginTransaction();


            const [
                produtos
            ] = await connection.query(
                `
                SELECT
                    id,
                    nome,
                    quantidade

                FROM produto

                WHERE id = ?
                  AND usuario_id = ?

                FOR UPDATE
                `,
                [
                    produtoId,
                    usuarioId
                ]
            );


            if (produtos.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    message:
                        'Produto não encontrado.'
                });

            }


            const produto =
                produtos[0];



            if (
                quantidade >
                produto.quantidade
            ) {

                await connection.rollback();

                return res.status(400).json({
                    message:
                        'Quantidade insuficiente em estoque.'
                });

            }



            await connection.query(
                `
                INSERT INTO saida_estoque
                (
                    produto_id,
                    quantidade
                )
                VALUES
                (
                    ?,
                    ?
                )
                `,
                [
                    produtoId,
                    quantidade
                ]
            );



            await connection.query(
                `
                UPDATE produto

                SET quantidade =
                    quantidade - ?

                WHERE id = ?
                  AND usuario_id = ?
                `,
                [
                    quantidade,
                    produtoId,
                    usuarioId
                ]
            );


            await connection.commit();


            return res.json({

                success: true,

                message:
                    'Saída registrada com sucesso!'

            });


        } catch (error) {

            await connection.rollback();

            console.log(
                'ERRO NA SAÍDA:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao registrar saída.',
                error:
                    error.message
            });

        } finally {

            connection.release();

        }

    }
);



app.get(
    '/api/history',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);


        if (!usuarioId) {

            return res.status(400).json({
                message:
                    'Informe o usuário.'
            });

        }


        try {

            const [
                movimentacoes
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
                        CONCAT(
                            'entrada-',
                            e.id
                        ) AS id,

                        p.nome AS produto,

                        e.quantidade AS quantidade,

                        e.data_movimentacao AS data,

                        'Entrada' AS tipo

                    FROM entrada_estoque e

                    INNER JOIN produto p
                        ON p.id = e.produto_id

                    WHERE p.usuario_id = ?


                    UNION ALL


                    SELECT
                        CONCAT(
                            'saida-',
                            s.id
                        ) AS id,

                        p.nome AS produto,

                        s.quantidade AS quantidade,

                        s.data_movimentacao AS data,

                        'Saída' AS tipo

                    FROM saida_estoque s

                    INNER JOIN produto p
                        ON p.id = s.produto_id

                    WHERE p.usuario_id = ?

                ) AS historico

                ORDER BY data DESC
                `,
                [
                    usuarioId,
                    usuarioId
                ]
            );


            movimentacoes.forEach(
                item => {

                    if (item.data) {

                        item.data =
                            new Date(
                                item.data
                            ).toLocaleString(
                                'pt-BR'
                            );

                    }

                }
            );


            return res.json(
                movimentacoes
            );


        } catch (error) {

            console.log(
                'ERRO NO HISTÓRICO:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao carregar histórico.',
                error:
                    error.message
            });

        }

    }
);



app.get(
    '/api/categories',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);


        if (!usuarioId) {

            return res.status(400).json({
                message:
                    'Informe o usuário.'
            });

        }


        try {

            const [
                categorias
            ] = await db.query(
                `
                SELECT
                    c.id,
                    c.nome,
                    c.descricao,
                    COUNT(p.id) AS total_produtos

                FROM categoria c

                LEFT JOIN produto p
                    ON p.categoria_id = c.id
                    AND p.usuario_id = ?

                WHERE c.usuario_id = ?

                GROUP BY
                    c.id,
                    c.nome,
                    c.descricao

                ORDER BY c.nome
                `,
                [
                    usuarioId,
                    usuarioId
                ]
            );


            return res.json(
                categorias
            );


        } catch (error) {

            console.log(
                'ERRO NAS CATEGORIAS:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao carregar categorias.',
                error:
                    error.message
            });

        }

    }
);



app.get(
    '/api/notifications',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);


        if (!usuarioId) {

            return res.status(400).json({
                message:
                    'Informe o usuário.'
            });

        }


        try {

            const notificacoes = [];



            const [
                produtosBaixo
            ] = await db.query(
                `
                SELECT
                    id,
                    nome,
                    quantidade

                FROM produto

                WHERE usuario_id = ?
                  AND quantidade <= 10

                ORDER BY quantidade ASC
                `,
                [usuarioId]
            );


            produtosBaixo.forEach(
                produto => {

                    notificacoes.push({

                        tipo:
                            'Estoque baixo',

                        mensagem:
                            `O produto ${produto.nome} está com apenas ${produto.quantidade} unidade(s).`,

                        data:
                            null

                    });

                }
            );


            const [
                entradas
            ] = await db.query(
                `
                SELECT
                    e.id,
                    p.nome,
                    e.quantidade,
                    e.data_movimentacao

                FROM entrada_estoque e

                INNER JOIN produto p
                    ON p.id = e.produto_id

                WHERE p.usuario_id = ?

                ORDER BY
                    e.data_movimentacao DESC

                LIMIT 10
                `,
                [usuarioId]
            );


            entradas.forEach(
                entrada => {

                    notificacoes.push({

                        tipo:
                            'Entrada',

                        mensagem:
                            `Entrada de ${entrada.quantidade} unidade(s) do produto ${entrada.nome}.`,

                        data:
                            entrada.data_movimentacao

                    });

                }
            );



            const [
                saidas
            ] = await db.query(
                `
                SELECT
                    s.id,
                    p.nome,
                    s.quantidade,
                    s.data_movimentacao

                FROM saida_estoque s

                INNER JOIN produto p
                    ON p.id = s.produto_id

                WHERE p.usuario_id = ?

                ORDER BY
                    s.data_movimentacao DESC

                LIMIT 10
                `,
                [usuarioId]
            );


            saidas.forEach(
                saida => {

                    notificacoes.push({

                        tipo:
                            'Saída',

                        mensagem:
                            `Saída de ${saida.quantidade} unidade(s) do produto ${saida.nome}.`,

                        data:
                            saida.data_movimentacao

                    });

                }
            );



            notificacoes.sort(
                (a, b) => {

                    if (!a.data) return 1;
                    if (!b.data) return -1;

                    return (
                        new Date(b.data) -
                        new Date(a.data)
                    );

                }
            );


            return res.json({

                total:
                    notificacoes.length,

                notificacoes:
                    notificacoes

            });


        } catch (error) {

            console.log(
                'ERRO NAS NOTIFICAÇÕES:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao carregar notificações.',
                error:
                    error.message
            });

        }

    }
);


app.get(
    '/api/profile/:usuarioId',
    async (req, res) => {

        const usuarioId =
            pegarUsuarioId(req);


        if (!usuarioId) {

            return res.status(400).json({
                message:
                    'Usuário inválido.'
            });

        }


        try {

            const [
                rows
            ] = await db.query(
                `
                SELECT
                    id,
                    usuario,
                    email

                FROM usuarios

                WHERE id = ?
                `,
                [usuarioId]
            );


            if (rows.length === 0) {

                return res.status(404).json({
                    message:
                        'Usuário não encontrado.'
                });

            }


            return res.json(
                rows[0]
            );


        } catch (error) {

            return res.status(500).json({
                message:
                    'Erro ao carregar perfil.',
                error:
                    error.message
            });

        }

    }
);



app.get(
    '/api/teste',
    async (req, res) => {

        try {

            const [
                rows
            ] = await db.query(
                'SELECT 1 AS teste'
            );


            return res.json({

                success: true,

                message:
                    'Node.js conectado ao MySQL!',

                resultado:
                    rows

            });


        } catch (error) {

            return res.status(500).json({

                success: false,

                message:
                    'Erro ao conectar ao MySQL.',

                error:
                    error.message

            });

        }

    }
);



app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                'Rota da API não encontrada.'

        });

    }
);



const PORT = 3000;

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log('');
        console.log('==========================================');
        console.log('       IC AGRÍCOLA - API MOBILE');
        console.log('==========================================');
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log('Local: http://localhost:3000');
        console.log('Rede: http://10.135.60.40:3000');
        console.log('==========================================');
        console.log('');

    }
);