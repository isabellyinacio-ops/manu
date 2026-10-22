from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash,
    jsonify
)

from conexao import conectar

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from validacao import (
    validar_usuario,
    validar_email,
    validar_senha,
    validar_confirmacao_senha,
    validar_produto,
    validar_quantidade,
    validar_preco,
    validar_movimentacao
)

from datetime import datetime


app = Flask(__name__)

app.secret_key = "estoque2026"


# ==========================================================
# FUNÇÕES AUXILIARES
# ==========================================================

def usuario_logado():
    return "usuario_id" in session


def resultado_validacao(resultado):
    """
    Aceita validações que retornem:

    (True, "Produto válido.")
    (False, "Produto inválido.")

    ou apenas uma mensagem de erro:

    "Produto inválido."

    ou:

    ""
    """

    if isinstance(resultado, tuple):

        if len(resultado) >= 2:
            valido = resultado[0]
            mensagem = resultado[1]

            return bool(valido), mensagem

        if len(resultado) == 1:
            return bool(resultado[0]), ""

    if isinstance(resultado, str):

        if resultado.strip() == "":
            return True, ""

        return False, resultado

    if isinstance(resultado, bool):
        return resultado, ""

    if resultado is None:
        return True, ""

    return bool(resultado), ""


# ==========================================================
# BUSCAR PRODUTOS DO USUÁRIO
# ==========================================================

def buscar_produtos_usuario():

    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                nome,
                quantidade,
                preco_unitario,
                usuario_id
            FROM produto
            WHERE usuario_id = %s
            ORDER BY id DESC
        """, (
            session["usuario_id"],
        ))

        return cursor.fetchall()

    except Exception as erro:

        print(
            "ERRO AO BUSCAR PRODUTOS:",
            erro
        )

        return []

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# BUSCAR NOTIFICAÇÕES
# ==========================================================

def buscar_notificacoes_usuario():

    conexao = None
    cursor = None

    notificacoes = []

    try:

        conexao = conectar()

        cursor = conexao.cursor(dictionary=True)

        usuario_id = session["usuario_id"]

        # ==================================================
        # ESTOQUE BAIXO
        # ==================================================

        cursor.execute("""
            SELECT
                id,
                nome,
                quantidade
            FROM produto
            WHERE usuario_id = %s
              AND quantidade <= 10
            ORDER BY quantidade ASC
        """, (
            usuario_id,
        ))

        produtos_baixo = cursor.fetchall()

        for produto in produtos_baixo:

            notificacoes.append({

                "tipo": "Estoque baixo",

                "mensagem": (
                    f"O produto {produto['nome']} "
                    f"está com apenas "
                    f"{produto['quantidade']} unidade(s)."
                ),

                "data": None

            })


        # ==================================================
        # ENTRADAS RECENTES
        # ==================================================

        cursor.execute("""
            SELECT
                e.id,
                p.nome,
                e.quantidade,
                e.data_movimentacao
            FROM entrada_estoque e
            INNER JOIN produto p
                ON p.id = e.produto_id
            WHERE p.usuario_id = %s
            ORDER BY e.data_movimentacao DESC
            LIMIT 10
        """, (
            usuario_id,
        ))

        entradas = cursor.fetchall()

        for entrada in entradas:

            notificacoes.append({

                "tipo": "Entrada",

                "mensagem": (
                    f"Entrada de "
                    f"{entrada['quantidade']} unidade(s) "
                    f"do produto {entrada['nome']}."
                ),

                "data": entrada["data_movimentacao"]

            })


        # ==================================================
        # SAÍDAS RECENTES
        # ==================================================

        cursor.execute("""
            SELECT
                s.id,
                p.nome,
                s.quantidade,
                s.data_movimentacao
            FROM saida_estoque s
            INNER JOIN produto p
                ON p.id = s.produto_id
            WHERE p.usuario_id = %s
            ORDER BY s.data_movimentacao DESC
            LIMIT 10
        """, (
            usuario_id,
        ))

        saidas = cursor.fetchall()

        for saida in saidas:

            notificacoes.append({

                "tipo": "Saída",

                "mensagem": (
                    f"Saída de "
                    f"{saida['quantidade']} unidade(s) "
                    f"do produto {saida['nome']}."
                ),

                "data": saida["data_movimentacao"]

            })


        # ==================================================
        # ORDENAR NOTIFICAÇÕES
        # ==================================================

        def data_notificacao(item):

            if isinstance(
                item["data"],
                datetime
            ):

                return item["data"]

            return datetime.min


        notificacoes.sort(
            key=data_notificacao,
            reverse=True
        )


        return notificacoes


    except Exception as erro:

        print(
            "ERRO AO BUSCAR NOTIFICAÇÕES:",
            erro
        )

        return []


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# NOTIFICAÇÕES GLOBAIS
# ==========================================================

@app.context_processor
def adicionar_notificacoes_globais():

    if "usuario_id" not in session:

        return {
            "contador_notificacoes": 0,
            "notificacoes": []
        }

    notificacoes = buscar_notificacoes_usuario()

    return {

        "contador_notificacoes":
            len(notificacoes),

        "notificacoes":
            notificacoes

    }


# ==========================================================
# PÁGINA INICIAL
# ==========================================================

@app.route("/")
def inicio():

    return render_template(
        "inicio.html"
    )


# ==========================================================
# LOGIN
# ==========================================================

@app.route("/login")
def login():

    return render_template(
        "login.html"
    )


@app.route("/logar", methods=["POST"])
def logar():

    email = request.form.get(
        "email",
        ""
    ).strip()

    senha = request.form.get(
        "senha",
        ""
    )

    if not email or not senha:

        flash(
            "Preencha e-mail e senha.",
            "error"
        )

        return redirect(
            url_for("login")
        )


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT
                id,
                usuario,
                email,
                senha
            FROM usuarios
            WHERE email = %s
        """, (
            email,
        ))

        usuario = cursor.fetchone()


        if usuario:

            try:

                senha_correta = check_password_hash(
                    usuario["senha"],
                    senha
                )

            except Exception:

                senha_correta = False


            if senha_correta:

                session["usuario_id"] = (
                    usuario["id"]
                )

                session["usuario"] = (
                    usuario["usuario"]
                )

                session["email"] = (
                    usuario["email"]
                )

                flash(
                    "Login realizado com sucesso!",
                    "success"
                )

                return redirect(
                    url_for("dashboard")
                )


        flash(
            "E-mail ou senha incorretos.",
            "error"
        )

        return redirect(
            url_for("login")
        )


    except Exception as erro:

        print(
            "ERRO AO REALIZAR LOGIN:",
            erro
        )

        flash(
            "Erro ao realizar login.",
            "error"
        )

        return redirect(
            url_for("login")
        )


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()



# ==========================================================
# CADASTRO DE USUÁRIO
# ==========================================================

@app.route("/cadastro")
def cadastro():

    return render_template(
        "cadastro.html"
    )


@app.route("/cadastrar", methods=["POST"])
def cadastrar():

    usuario = request.form.get(
        "usuario",
        ""
    ).strip()

    email = request.form.get(
        "email",
        ""
    ).strip()

    senha = request.form.get(
        "senha",
        ""
    )

    confirmacao = request.form.get(
        "confirmacao",
        ""
    )


    # USUÁRIO

    resultado = validar_usuario(
        usuario
    )

    valido, mensagem = resultado_validacao(
        resultado
    )

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for("cadastro")
        )


    # E-MAIL

    resultado = validar_email(
        email
    )

    valido, mensagem = resultado_validacao(
        resultado
    )

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for("cadastro")
        )


    # SENHA

    resultado = validar_senha(
        senha
    )

    valido, mensagem = resultado_validacao(
        resultado
    )

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for("cadastro")
        )


    # CONFIRMAÇÃO

    resultado = validar_confirmacao_senha(
        senha,
        confirmacao
    )

    valido, mensagem = resultado_validacao(
        resultado
    )

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for("cadastro")
        )


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT id
            FROM usuarios
            WHERE email = %s
        """, (
            email,
        ))

        usuario_existente = cursor.fetchone()


        if usuario_existente:

            flash(
                "Este e-mail já está cadastrado.",
                "error"
            )

            return redirect(
                url_for("cadastro")
            )


        senha_hash = generate_password_hash(
            senha
        )


        cursor.execute("""
            INSERT INTO usuarios
                (
                    usuario,
                    email,
                    senha
                )
            VALUES
                (
                    %s,
                    %s,
                    %s
                )
        """, (
            usuario,
            email,
            senha_hash
        ))


        conexao.commit()


        flash(
            "Cadastro realizado com sucesso!",
            "success"
        )

        return redirect(
            url_for("login")
        )


    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO CADASTRAR USUÁRIO:",
            erro
        )

        flash(
            "Erro ao realizar cadastro.",
            "error"
        )

        return redirect(
            url_for("cadastro")
        )


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# PERFIL
# ==========================================================

@app.route("/perfil", methods=["GET", "POST"])
def perfil():

    if not usuario_logado():
        return redirect(url_for("login"))

    conexao = None
    cursor = None

    try:

        conexao = conectar()
        cursor = conexao.cursor(dictionary=True)

        # =========================
        # SALVAR ALTERAÇÕES
        # =========================
        if request.method == "POST":

            usuario_novo = request.form.get("usuario", "").strip()
            email_novo = request.form.get("email", "").strip()
            senha = request.form.get("senha", "")
            confirmacao = request.form.get("confirmacao", "")

            # Verifica campos obrigatórios
            if not usuario_novo or not email_novo:
                flash(
                    "Preencha o nome de usuário e o e-mail.",
                    "error"
                )
                return redirect(url_for("perfil"))

            # Verifica se as senhas coincidem
            if senha or confirmacao:

                if senha != confirmacao:
                    flash(
                        "As senhas não coincidem.",
                        "error"
                    )
                    return redirect(url_for("perfil"))

            # Verifica se o e-mail já pertence a outro usuário
            cursor.execute("""
                SELECT id
                FROM usuarios
                WHERE email = %s
                AND id != %s
            """, (
                email_novo,
                session["usuario_id"]
            ))

            email_existente = cursor.fetchone()

            if email_existente:
                flash(
                    "Este e-mail já está cadastrado.",
                    "error"
                )
                return redirect(url_for("perfil"))

            # Verifica se o nome de usuário já pertence a outro usuário
            cursor.execute("""
                SELECT id
                FROM usuarios
                WHERE usuario = %s
                AND id != %s
            """, (
                usuario_novo,
                session["usuario_id"]
            ))

            usuario_existente = cursor.fetchone()

            if usuario_existente:
                flash(
                    "Este nome de usuário já está cadastrado.",
                    "error"
                )
                return redirect(url_for("perfil"))

            # =========================
            # ATUALIZA COM OU SEM SENHA
            # =========================

            if senha:

                senha_hash = generate_password_hash(senha)

                cursor.execute("""
                    UPDATE usuarios
                    SET usuario = %s,
                        email = %s,
                        senha = %s
                    WHERE id = %s
                """, (
                    usuario_novo,
                    email_novo,
                    senha_hash,
                    session["usuario_id"]
                ))

            else:

                cursor.execute("""
                    UPDATE usuarios
                    SET usuario = %s,
                        email = %s
                    WHERE id = %s
                """, (
                    usuario_novo,
                    email_novo,
                    session["usuario_id"]
                ))

            conexao.commit()

            # Atualiza o nome armazenado na sessão
            session["usuario"] = usuario_novo

            flash(
                "Perfil atualizado com sucesso!",
                "success"
            )

            return redirect(url_for("perfil"))

        # =========================
        # CARREGAR PERFIL
        # =========================

        cursor.execute("""
            SELECT
                id,
                usuario,
                email
            FROM usuarios
            WHERE id = %s
        """, (
            session["usuario_id"],
        ))

        usuario = cursor.fetchone()

        return render_template(
            "perfil.html",
            usuario=usuario
        )

    except Exception as erro:

        print(
            "ERRO AO CARREGAR/ATUALIZAR PERFIL:",
            erro
        )

        if conexao:
            conexao.rollback()

        flash(
            "Erro ao atualizar o perfil.",
            "error"
        )

        return redirect(
            url_for("perfil")
        )

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()

# ==========================================================
# DASHBOARD
# ==========================================================

@app.route("/dashboard")
def dashboard():

    # Verifica se o usuário está logado
    if "usuario_id" not in session:
        return redirect(url_for("login"))

    usuario_id = session["usuario_id"]

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    try:

        # =====================================================
        # PRODUTOS DO USUÁRIO
        # =====================================================

        cursor.execute("""
            SELECT
                id,
                nome,
                quantidade,
                preco_unitario
            FROM produto
            WHERE usuario_id = %s
            ORDER BY id DESC
        """, (usuario_id,))

        produtos = cursor.fetchall()


        # =====================================================
        # TOTAL DE PRODUTOS
        # =====================================================

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM produto
            WHERE usuario_id = %s
        """, (usuario_id,))

        resultado = cursor.fetchone()

        total_produtos = resultado["total"]


        # =====================================================
        # QUANTIDADE TOTAL EM ESTOQUE
        # =====================================================

        cursor.execute("""
            SELECT COALESCE(SUM(quantidade), 0) AS total
            FROM produto
            WHERE usuario_id = %s
        """, (usuario_id,))

        resultado = cursor.fetchone()

        total_quantidade = resultado["total"]


        # =====================================================
        # VALOR TOTAL DO ESTOQUE
        # =====================================================

        cursor.execute("""
            SELECT COALESCE(
                SUM(quantidade * preco_unitario),
                0
            ) AS total
            FROM produto
            WHERE usuario_id = %s
        """, (usuario_id,))

        resultado = cursor.fetchone()

        valor_total = resultado["total"]


        # =====================================================
        # PRODUTOS COM ESTOQUE BAIXO
        # =====================================================

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM produto
            WHERE usuario_id = %s
            AND quantidade <= 10
        """, (usuario_id,))

        resultado = cursor.fetchone()

        estoque_baixo = resultado["total"]


    finally:

        cursor.close()
        conexao.close()


    # =====================================================
    # DATA ATUAL
    # =====================================================

    from datetime import datetime

    data_atual = datetime.now().strftime(
        "%d/%m/%Y"
    )


    # =====================================================
    # ENVIA TUDO PARA O DASHBOARD
    # =====================================================

    return render_template(
        "dashboard.html",

        produtos=produtos,

        total_produtos=total_produtos,

        total_quantidade=total_quantidade,

        valor_total=valor_total,

        estoque_baixo=estoque_baixo,

        data_atual=data_atual
    )


# ==========================================================
# PRODUTOS
# ==========================================================

@app.route("/produtos")
def produtos():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    lista_produtos = (
        buscar_produtos_usuario()
    )


    return render_template(
        "produtos.html",
        produtos=lista_produtos
    )


# ==========================================================
# CADASTRAR PRODUTO
# ==========================================================

@app.route(
    "/cadastrar_produto",
    methods=["GET", "POST"]
)
def cadastrar_produto():

    if not usuario_logado():
        return redirect(url_for("login"))

    conexao = None
    cursor = None

    try:

        conexao = conectar()
        cursor = conexao.cursor(dictionary=True)

        usuario_id = session["usuario_id"]

        # ==================================================
        # BUSCAR CATEGORIAS DO USUÁRIO
        # ==================================================

        cursor.execute("""
            SELECT
                id,
                nome,
                descricao
            FROM categoria
            WHERE usuario_id = %s
            ORDER BY nome
        """, (
            usuario_id,
        ))

        categorias = cursor.fetchall()

        # ==================================================
        # DATA ATUAL
        # ==================================================

        data_atual = datetime.now().strftime(
            "%d/%m/%Y"
        )

        # ==================================================
        # ABRIR PÁGINA
        # ==================================================

        if request.method == "GET":

            return render_template(
                "cadastrar_produto.html",
                categorias=categorias,
                data_atual=data_atual
            )

        # ==================================================
        # RECEBER FORMULÁRIO
        # ==================================================

        nome = request.form.get(
            "nome",
            ""
        ).strip()

        preco_unitario = request.form.get(
            "preco_unitario",
            ""
        ).strip()

        categoria_id = request.form.get(
            "categoria_id",
            ""
        ).strip()

        # ==================================================
        # VALIDAR PRODUTO
        # ==================================================

        resultado = validar_produto(nome)

        valido, mensagem = resultado_validacao(resultado)

        if not valido:

            flash(
                mensagem,
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        # ==================================================
        # VALIDAR PREÇO
        # ==================================================

        resultado = validar_preco(
            preco_unitario
        )

        valido, mensagem = resultado_validacao(resultado)

        if not valido:

            flash(
                mensagem,
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        try:

            preco = float(
                str(preco_unitario).replace(
                    ",",
                    "."
                )
            )

        except (ValueError, TypeError):

            flash(
                "Informe um preço válido.",
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        if preco < 0:

            flash(
                "O preço não pode ser negativo.",
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        # ==================================================
        # VALIDAR CATEGORIA
        # ==================================================

        if not categoria_id:

            flash(
                "Selecione uma categoria.",
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        try:

            categoria_id = int(categoria_id)

        except (ValueError, TypeError):

            flash(
                "Categoria inválida.",
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        # ==================================================
        # CONFIRMAR QUE A CATEGORIA PERTENCE AO USUÁRIO
        # ==================================================

        cursor.execute("""
            SELECT id
            FROM categoria
            WHERE id = %s
            AND usuario_id = %s
        """, (
            categoria_id,
            usuario_id
        ))

        categoria = cursor.fetchone()

        if not categoria:

            flash(
                "Categoria inválida.",
                "error"
            )

            return redirect(
                url_for("cadastrar_produto")
            )

        # ==================================================
        # CADASTRAR PRODUTO
        # ==================================================

        cursor.execute("""
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
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            nome,
            0,
            preco,
            usuario_id,
            categoria_id
        ))

        conexao.commit()

        flash(
            "Produto cadastrado com sucesso!",
            "success"
        )

        return redirect(
            url_for("produtos")
        )

    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO CADASTRAR PRODUTO:",
            erro
        )

        flash(
            "Erro ao cadastrar produto.",
            "error"
        )

        return redirect(
            url_for("cadastrar_produto")
        )

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()
# ==========================================================
# EDITAR PRODUTO
# ==========================================================
# ==========================================================
# EDITAR PRODUTO
# ==========================================================

@app.route(
    "/editar_produto/<int:id>"
)
def editar_produto(id):

    if not usuario_logado():

        return redirect(
            url_for("login")
        )

    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )

        usuario_id = session["usuario_id"]

        # ==================================================
        # BUSCAR PRODUTO
        # ==================================================

        cursor.execute("""
            SELECT
                p.id,
                p.nome,
                p.quantidade,
                p.preco_unitario,
                p.categoria_id
            FROM produto p
            WHERE p.id = %s
            AND p.usuario_id = %s
        """, (
            id,
            usuario_id
        ))

        produto = cursor.fetchone()

        if not produto:

            flash(
                "Produto não encontrado.",
                "error"
            )

            return redirect(
                url_for("produtos")
            )

        # ==================================================
        # BUSCAR CATEGORIAS
        # ==================================================

        cursor.execute("""
            SELECT
                id,
                nome,
                descricao
            FROM categoria
            WHERE usuario_id = %s
            ORDER BY nome
        """, (
            usuario_id,
        ))

        categorias = cursor.fetchall()

        # ==================================================
        # DATA ATUAL
        # ==================================================

        data_atual = datetime.now().strftime(
            "%d/%m/%Y"
        )

        return render_template(
            "editar_produto.html",
            produto=produto,
            categorias=categorias,
            data_atual=data_atual
        )

    except Exception as erro:

        print(
            "ERRO AO EDITAR PRODUTO:",
            erro
        )

        flash(
            "Erro ao carregar produto.",
            "error"
        )

        return redirect(
            url_for("produtos")
        )

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()

# ==========================================================
# ATUALIZAR PRODUTO
# ==========================================================

@app.route(
    "/atualizar_produto/<int:id>",
    methods=["POST"]
)
def atualizar_produto(id):

    if not usuario_logado():

        return redirect(
            url_for("login")
        )

    nome = request.form.get(
        "nome",
        ""
    ).strip()

    preco = request.form.get(
        "preco_unitario",
        ""
    ).strip()

    categoria_id = request.form.get(
        "categoria_id",
        ""
    ).strip()

    # ==================================================
    # VALIDAR PRODUTO
    # ==================================================

    resultado = validar_produto(nome)

    valido, mensagem = resultado_validacao(resultado)

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    # ==================================================
    # VALIDAR PREÇO
    # ==================================================

    resultado = validar_preco(preco)

    valido, mensagem = resultado_validacao(resultado)

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    try:

        preco_float = float(
            str(preco).replace(
                ",",
                "."
            )
        )

    except (ValueError, TypeError):

        flash(
            "Informe um preço válido.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    if preco_float < 0:

        flash(
            "O preço não pode ser negativo.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    # ==================================================
    # VALIDAR CATEGORIA
    # ==================================================

    if not categoria_id:

        flash(
            "Selecione uma categoria.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    try:

        categoria_id = int(categoria_id)

    except (ValueError, TypeError):

        flash(
            "Categoria inválida.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )

        usuario_id = session["usuario_id"]

        # ==================================================
        # CONFIRMAR PRODUTO
        # ==================================================

        cursor.execute("""
            SELECT id
            FROM produto
            WHERE id = %s
            AND usuario_id = %s
        """, (
            id,
            usuario_id
        ))

        produto = cursor.fetchone()

        if not produto:

            flash(
                "Produto não encontrado.",
                "error"
            )

            return redirect(
                url_for("produtos")
            )

        # ==================================================
        # CONFIRMAR CATEGORIA
        # ==================================================

        cursor.execute("""
            SELECT id
            FROM categoria
            WHERE id = %s
            AND usuario_id = %s
        """, (
            categoria_id,
            usuario_id
        ))

        categoria = cursor.fetchone()

        if not categoria:

            flash(
                "Categoria inválida.",
                "error"
            )

            return redirect(
                url_for(
                    "editar_produto",
                    id=id
                )
            )

        # ==================================================
        # ATUALIZAR PRODUTO
        # ==================================================

        cursor.execute("""
            UPDATE produto
            SET
                nome = %s,
                preco_unitario = %s,
                categoria_id = %s
            WHERE id = %s
            AND usuario_id = %s
        """, (
            nome,
            preco_float,
            categoria_id,
            id,
            usuario_id
        ))

        conexao.commit()

        flash(
            "Produto atualizado com sucesso!",
            "success"
        )

        return redirect(
            url_for("produtos")
        )

    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO ATUALIZAR PRODUTO:",
            erro
        )

        flash(
            "Erro ao atualizar produto.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()

    # ==================================================
    # VALIDAR CATEGORIA
    # ==================================================

    if not categoria_id:

        flash(
            "Selecione uma categoria.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    try:

        categoria_id = int(categoria_id)

    except (ValueError, TypeError):

        flash(
            "Categoria inválida.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )

        usuario_id = session["usuario_id"]

        # ==================================================
        # CONFIRMAR PRODUTO
        # ==================================================

        cursor.execute("""
            SELECT id
            FROM produto
            WHERE id = %s
            AND usuario_id = %s
        """, (
            id,
            usuario_id
        ))

        produto = cursor.fetchone()

        if not produto:

            flash(
                "Produto não encontrado.",
                "error"
            )

            return redirect(
                url_for("produtos")
            )

        # ==================================================
        # CONFIRMAR CATEGORIA
        # ==================================================

        cursor.execute("""
            SELECT id
            FROM categoria
            WHERE id = %s
            AND usuario_id = %s
        """, (
            categoria_id,
            usuario_id
        ))

        categoria = cursor.fetchone()

        if not categoria:

            flash(
                "Categoria inválida.",
                "error"
            )

            return redirect(
                url_for(
                    "editar_produto",
                    id=id
                )
            )

        # ==================================================
        # ATUALIZAR PRODUTO
        # ==================================================

        cursor.execute("""
            UPDATE produto
            SET
                nome = %s,
                preco_unitario = %s,
                categoria_id = %s
            WHERE id = %s
            AND usuario_id = %s
        """, (
            nome,
            preco_float,
            categoria_id,
            id,
            usuario_id
        ))

        conexao.commit()

        flash(
            "Produto atualizado com sucesso!",
            "success"
        )

        return redirect(
            url_for("produtos")
        )

    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO ATUALIZAR PRODUTO:",
            erro
        )

        flash(
            "Erro ao atualizar produto.",
            "error"
        )

        return redirect(
            url_for(
                "editar_produto",
                id=id
            )
        )

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()
# ==========================================================
# EXCLUIR PRODUTO
# ==========================================================

@app.route(
    "/excluir/<int:id>",
    methods=["POST"]
)
def excluir(id):

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )


        # CONFIRMAR PRODUTO

        cursor.execute("""
            SELECT id
            FROM produto
            WHERE id = %s
              AND usuario_id = %s
        """, (
            id,
            session["usuario_id"]
        ))


        produto = cursor.fetchone()


        if not produto:

            flash(
                "Produto não encontrado.",
                "error"
            )

            return redirect(
                url_for("produtos")
            )


        # EXCLUIR ENTRADAS

        cursor.execute("""
            DELETE FROM entrada_estoque
            WHERE produto_id = %s
        """, (
            id,
        ))


        # EXCLUIR SAÍDAS

        cursor.execute("""
            DELETE FROM saida_estoque
            WHERE produto_id = %s
        """, (
            id,
        ))


        # EXCLUIR PRODUTO

        cursor.execute("""
            DELETE FROM produto
            WHERE id = %s
              AND usuario_id = %s
        """, (
            id,
            session["usuario_id"]
        ))


        conexao.commit()


        flash(
            "Produto excluído com sucesso!",
            "success"
        )

        return redirect(
            url_for("produtos")
        )


    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO EXCLUIR PRODUTO:",
            erro
        )

        flash(
            "Erro ao excluir produto.",
            "error"
        )

        return redirect(
            url_for("produtos")
        )


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# ENTRADA DE ESTOQUE
# ==========================================================

@app.route("/entrada")
def entrada():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    produtos_usuario = (
        buscar_produtos_usuario()
    )


    return render_template(
        "entrada.html",
        produtos=produtos_usuario
    )


@app.route(
    "/registrar_entrada",
    methods=["POST"]
)
def registrar_entrada():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    produto_id = request.form.get(
        "produto",
        ""
    ).strip()

    quantidade = request.form.get(
        "quantidade",
        ""
    ).strip()


    # VALIDAR QUANTIDADE

    resultado = validar_quantidade(
        quantidade
    )

    valido, mensagem = resultado_validacao(
        resultado
    )

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for("entrada")
        )


    if not produto_id:

        flash(
            "Selecione um produto.",
            "error"
        )

        return redirect(
            url_for("entrada")
        )


    try:

        quantidade_int = int(
            quantidade
        )

    except (ValueError, TypeError):

        flash(
            "Informe uma quantidade válida.",
            "error"
        )

        return redirect(
            url_for("entrada")
        )


    if quantidade_int <= 0:

        flash(
            "A quantidade deve ser maior que zero.",
            "error"
        )

        return redirect(
            url_for("entrada")
        )


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )


        # CONFIRMAR PRODUTO

        cursor.execute("""
            SELECT id
            FROM produto
            WHERE id = %s
              AND usuario_id = %s
        """, (
            produto_id,
            session["usuario_id"]
        ))


        produto = cursor.fetchone()


        if not produto:

            flash(
                "Produto inválido.",
                "error"
            )

            return redirect(
                url_for("entrada")
            )


        # REGISTRAR ENTRADA

        cursor.execute("""
            INSERT INTO entrada_estoque
                (
                    produto_id,
                    quantidade
                )
            VALUES
                (
                    %s,
                    %s
                )
        """, (
            produto_id,
            quantidade_int
        ))


        # ATUALIZAR ESTOQUE

        cursor.execute("""
            UPDATE produto
            SET quantidade =
                quantidade + %s
            WHERE id = %s
              AND usuario_id = %s
        """, (
            quantidade_int,
            produto_id,
            session["usuario_id"]
        ))


        conexao.commit()


        flash(
            "Entrada registrada com sucesso!",
            "success"
        )

        return redirect(
            url_for("entrada")
        )


    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO REGISTRAR ENTRADA:",
            erro
        )

        flash(
            "Erro ao registrar entrada.",
            "error"
        )

        return redirect(
            url_for("entrada")
        )


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# SAÍDA DE ESTOQUE
# ==========================================================

@app.route("/saida")
def saida():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    produtos_usuario = (
        buscar_produtos_usuario()
    )


    return render_template(
        "saida.html",
        produtos=produtos_usuario
    )


@app.route(
    "/registrar_saida",
    methods=["POST"]
)
def registrar_saida():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    produto_id = request.form.get(
        "produto",
        ""
    ).strip()

    quantidade = request.form.get(
        "quantidade",
        ""
    ).strip()


    # VALIDAR QUANTIDADE

    resultado = validar_quantidade(
        quantidade
    )

    valido, mensagem = resultado_validacao(
        resultado
    )

    if not valido:

        flash(
            mensagem,
            "error"
        )

        return redirect(
            url_for("saida")
        )


    if not produto_id:

        flash(
            "Selecione um produto.",
            "error"
        )

        return redirect(
            url_for("saida")
        )


    try:

        quantidade_saida = int(
            quantidade
        )

    except (ValueError, TypeError):

        flash(
            "Informe uma quantidade válida.",
            "error"
        )

        return redirect(
            url_for("saida")
        )


    if quantidade_saida <= 0:

        flash(
            "A quantidade deve ser maior que zero.",
            "error"
        )

        return redirect(
            url_for("saida")
        )


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )


        # BUSCAR PRODUTO

        cursor.execute("""
            SELECT
                id,
                quantidade
            FROM produto
            WHERE id = %s
              AND usuario_id = %s
        """, (
            produto_id,
            session["usuario_id"]
        ))


        produto = cursor.fetchone()


        if not produto:

            flash(
                "Produto inválido.",
                "error"
            )

            return redirect(
                url_for("saida")
            )


        # VERIFICAR ESTOQUE

        if quantidade_saida > produto["quantidade"]:

            flash(
                "Quantidade insuficiente em estoque.",
                "error"
            )

            return redirect(
                url_for("saida")
            )


        # REGISTRAR SAÍDA

        cursor.execute("""
            INSERT INTO saida_estoque
                (
                    produto_id,
                    quantidade
                )
            VALUES
                (
                    %s,
                    %s
                )
        """, (
            produto_id,
            quantidade_saida
        ))


        # ATUALIZAR ESTOQUE

        cursor.execute("""
            UPDATE produto
            SET quantidade =
                quantidade - %s
            WHERE id = %s
              AND usuario_id = %s
        """, (
            quantidade_saida,
            produto_id,
            session["usuario_id"]
        ))


        conexao.commit()


        flash(
            "Saída registrada com sucesso!",
            "success"
        )

        return redirect(
            url_for("saida")
        )


    except Exception as erro:

        if conexao:
            conexao.rollback()

        print(
            "ERRO AO REGISTRAR SAÍDA:",
            erro
        )

        flash(
            "Erro ao registrar saída.",
            "error"
        )

        return redirect(
            url_for("saida")
        )


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# MOVIMENTAÇÕES
# ==========================================================

@app.route("/movimentacao")
def movimentacao():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )

        usuario_id = session["usuario_id"]


        # ==================================================
        # CONSULTA DE MOVIMENTAÇÕES
        #
        # A consulta foi feita usando uma subconsulta para
        # evitar problemas do MySQL com ORDER BY no UNION.
        # ==================================================

        cursor.execute("""
            SELECT
                id,
                produto,
                quantidade,
                data,
                tipo
            FROM (

                SELECT
                    e.id AS id,
                    p.nome AS produto,
                    e.quantidade AS quantidade,
                    e.data_movimentacao AS data,
                    'Entrada' AS tipo

                FROM entrada_estoque e

                INNER JOIN produto p
                    ON p.id = e.produto_id

                WHERE p.usuario_id = %s


                UNION ALL


                SELECT
                    s.id AS id,
                    p.nome AS produto,
                    s.quantidade AS quantidade,
                    s.data_movimentacao AS data,
                    'Saída' AS tipo

                FROM saida_estoque s

                INNER JOIN produto p
                    ON p.id = s.produto_id

                WHERE p.usuario_id = %s

            ) AS movimentacoes_tabela

            ORDER BY data DESC
        """, (
            usuario_id,
            usuario_id
        ))


        movimentacoes = cursor.fetchall()


        total_movimentacao = len(
            movimentacoes
        )


        print(
            "MOVIMENTAÇÕES CARREGADAS:",
            total_movimentacao
        )


        return render_template(
            "movimentacao.html",
            movimentacoes=movimentacoes,
            total_movimentacao=total_movimentacao
        )


    except Exception as erro:

        # AGORA O ERRO REAL APARECE NO TERMINAL

        print(
            "=========================================="
        )

        print(
            "ERRO AO CARREGAR MOVIMENTAÇÕES:"
        )

        print(
            erro
        )

        print(
            "=========================================="
        )


        flash(
            "Erro ao carregar movimentações.",
            "error"
        )

        return redirect(
            url_for("dashboard")
        )


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()


# ==========================================================
# NOTIFICAÇÕES
# ==========================================================

@app.route("/notificacoes")
def notificacoes():

    if not usuario_logado():

        return redirect(
            url_for("login")
        )


    lista_notificacoes = (
        buscar_notificacoes_usuario()
    )


    return render_template(
        "notificacoes.html",
        notificacoes=lista_notificacoes,
        notificacoes_recentes=lista_notificacoes
    )


# ==========================================================
# API DO DASHBOARD
# ==========================================================

@app.route(
    "/api/dashboard/<int:usuario_id>"
)
def api_dashboard(usuario_id):

    if not usuario_logado():

        return jsonify({
            "erro":
                "Usuário não autenticado"
        }), 401


    if usuario_id != session["usuario_id"]:

        return jsonify({
            "erro":
                "Acesso não permitido"
        }), 403


    conexao = None
    cursor = None

    try:

        conexao = conectar()

        cursor = conexao.cursor(
            dictionary=True
        )


        # TOTAL DE PRODUTOS

        cursor.execute("""
            SELECT
                COUNT(*) AS totalProducts
            FROM produto
            WHERE usuario_id = %s
        """, (
            usuario_id,
        ))

        total_products = cursor.fetchone()[
            "totalProducts"
        ]


        # ESTOQUE BAIXO

        cursor.execute("""
            SELECT
                COUNT(*) AS lowStockCount
            FROM produto
            WHERE usuario_id = %s
              AND quantidade <= 10
        """, (
            usuario_id,
        ))

        low_stock_count = cursor.fetchone()[
            "lowStockCount"
        ]


        # ATIVIDADES

        cursor.execute("""
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

                WHERE p.usuario_id = %s


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

                WHERE p.usuario_id = %s

            ) AS atividades_tabela

            ORDER BY data DESC

            LIMIT 5
        """, (
            usuario_id,
            usuario_id
        ))


        atividades = cursor.fetchall()


        for atividade in atividades:

            if isinstance(
                atividade["data"],
                datetime
            ):

                atividade["data"] = (
                    atividade["data"]
                    .strftime(
                        "%d/%m/%Y %H:%M"
                    )
                )


        return jsonify({

            "totalProducts":
                total_products,

            "lowStockCount":
                low_stock_count,

            "recentActivities":
                atividades

        })


    except Exception as erro:

        print(
            "ERRO NA API DO DASHBOARD:",
            erro
        )

        return jsonify({
            "erro":
                "Erro ao carregar dados"
        }), 500


    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()




@app.route("/categorias")
def categorias():
    if "usuario_id" not in session:
        return redirect(url_for("login"))

    usuario_id = session["usuario_id"]

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            c.id,
            c.nome,
            c.descricao,
            COUNT(p.id) AS total_produtos
        FROM categoria c
        LEFT JOIN produto p
            ON p.categoria_id = c.id
            AND p.usuario_id = %s
        WHERE c.usuario_id = %s
        GROUP BY c.id, c.nome, c.descricao
        ORDER BY c.nome
    """, (usuario_id, usuario_id))

    categorias = cursor.fetchall()

    cursor.close()
    conexao.close()

    return render_template(
        "categorias.html",
        categorias=categorias
    )

@app.route("/categoria/<int:id>")
def categoria_detalhes(id):
    if "usuario_id" not in session:
        return redirect(url_for("login"))

    usuario_id = session["usuario_id"]

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, nome, descricao
        FROM categoria
        WHERE id = %s
        AND usuario_id = %s
    """, (id, usuario_id))

    categoria = cursor.fetchone()

    if not categoria:
        cursor.close()
        conexao.close()

        flash("Categoria não encontrada.", "erro")
        return redirect(url_for("categorias"))

    cursor.execute("""
        SELECT
            id,
            nome,
            quantidade,
            preco_unitario
        FROM produto
        WHERE categoria_id = %s
        AND usuario_id = %s
        ORDER BY nome
    """, (id, usuario_id))

    produtos = cursor.fetchall()

    cursor.close()
    conexao.close()

    return render_template(
        "categoria_detalhes.html",
        categoria=categoria,
        produtos=produtos
    )

@app.route("/produto/<int:id>")
def produto_detalhes(id):

    if "usuario_id" not in session:
        return redirect(url_for("login"))

    usuario_id = session["usuario_id"]

    conexao = None
    cursor = None

    try:

        conexao = conectar()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.id,
                p.nome,
                p.quantidade,
                p.preco_unitario,
                p.categoria_id,
                c.nome AS categoria_nome
            FROM produto p
            LEFT JOIN categoria c
                ON p.categoria_id = c.id
            WHERE p.id = %s
            AND p.usuario_id = %s
        """, (id, usuario_id))

        produto = cursor.fetchone()

        if not produto:
            flash("Produto não encontrado.", "erro")
            return redirect(url_for("produtos"))

        return render_template(
            "produto_detalhes.html",
            produto=produto
        )

    except Exception as erro:

        print("ERRO AO CARREGAR PRODUTO:", erro)

        flash(
            "Erro ao carregar informações do produto.",
            "erro"
        )

        return redirect(url_for("produtos"))

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()

@app.route("/cadastrar_categoria", methods=["GET", "POST"])
def cadastrar_categoria():
    if "usuario_id" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":

        nome = request.form.get("nome", "").strip()
        descricao = request.form.get("descricao", "").strip()

        if not nome:
            flash("Informe o nome da categoria.", "erro")
            return redirect(url_for("cadastrar_categoria"))

        usuario_id = session["usuario_id"]

        conexao = conectar()
        cursor = conexao.cursor()

        cursor.execute("""
            INSERT INTO categoria (nome, descricao, usuario_id)
            VALUES (%s, %s, %s)
        """, (nome, descricao, usuario_id))

        conexao.commit()

        cursor.close()
        conexao.close()

        flash("Categoria cadastrada com sucesso!", "sucesso")

        return redirect(url_for("categorias"))

    return render_template("cadastrar_categoria.html")
# ==========================================================
# LOGOUT
# ==========================================================

@app.route("/logout")
def logout():

    session.clear()

    flash(
        "Você saiu da sua conta.",
        "success"
    )

    return redirect(
        url_for("login")
    )

@app.route("/404")
def pagina_404():
    return render_template("404.html"), 404

@app.errorhandler(404)
def pagina_nao_encontrada(e):
    return render_template("404.html"), 404

# ==========================================================
# EXECUTAR SISTEMA
# ==========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )