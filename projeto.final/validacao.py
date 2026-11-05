import re


def validar_usuario(usuario):
    if not usuario:
        return False, "O usuário é obrigatório."

    usuario = usuario.strip()

    if len(usuario) < 3:
        return False, "O usuário deve ter pelo menos 3 caracteres."

    if len(usuario) > 100:
        return False, "O usuário deve ter no máximo 100 caracteres."

    if not re.match(r"^[a-zA-ZÀ-ÿ0-9_.\- ]+$", usuario):
        return False, "O usuário possui caracteres inválidos."

    return True, "Usuário válido."


def validar_email(email):
    if not email:
        return False, "O e-mail é obrigatório."

    email = email.strip()

    if len(email) > 100:
        return False, "O e-mail é muito longo."

    padrao = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    if not re.match(padrao, email):
        return False, "Digite um e-mail válido."

    return True, "E-mail válido."


def validar_senha(senha):
    if not senha:
        return False, "A senha é obrigatória."

    if len(senha) < 8:
        return False, "A senha deve ter pelo menos 8 caracteres."

    if len(senha) > 100:
        return False, "A senha é muito longa."

    if not re.search(r"[A-Z]", senha):
        return False, "A senha deve conter pelo menos uma letra maiúscula."

    if not re.search(r"[a-z]", senha):
        return False, "A senha deve conter pelo menos uma letra minúscula."

    if not re.search(r"[0-9]", senha):
        return False, "A senha deve conter pelo menos um número."

    return True, "Senha válida."


def validar_confirmacao_senha(senha, confirmar):
    if not confirmar:
        return False, "Confirme sua senha."

    if senha != confirmar:
        return False, "As senhas não coincidem."

    return True, "As senhas coincidem."


def validar_produto(nome):
    if not nome:
        return False, "O nome do produto é obrigatório."

    nome = nome.strip()

    if len(nome) < 2:
        return False, "O nome do produto deve ter pelo menos 2 caracteres."

    if len(nome) > 100:
        return False, "O nome do produto é muito longo."

    return True, "Produto válido."


def validar_quantidade(quantidade):
    if quantidade is None or quantidade == "":
        return False, "A quantidade é obrigatória."

    try:
        quantidade = int(quantidade)
    except (ValueError, TypeError):
        return False, "A quantidade deve ser um número inteiro."

    if quantidade < 0:
        return False, "A quantidade não pode ser negativa."

    return True, "Quantidade válida."


def validar_quantidade_movimentacao(quantidade):
    if quantidade is None or quantidade == "":
        return False, "A quantidade é obrigatória."

    try:
        quantidade = int(quantidade)
    except (ValueError, TypeError):
        return False, "A quantidade deve ser um número inteiro."

    if quantidade <= 0:
        return False, "A quantidade deve ser maior que zero."

    return True, "Quantidade válida."


def validar_preco(preco):
    if preco is None or preco == "":
        return False, "O preço é obrigatório."

    try:
        preco = str(preco).replace(",", ".")
        preco = float(preco)
    except (ValueError, TypeError):
        return False, "O preço deve ser um número válido."

    if preco < 0:
        return False, "O preço não pode ser negativo."

    return True, "Preço válido."


def validar_cadastro(usuario, email, senha, confirmar):
    valido, mensagem = validar_usuario(usuario)

    if not valido:
        return False, mensagem

    valido, mensagem = validar_email(email)

    if not valido:
        return False, mensagem

    valido, mensagem = validar_senha(senha)

    if not valido:
        return False, mensagem

    valido, mensagem = validar_confirmacao_senha(
        senha,
        confirmar
    )

    if not valido:
        return False, mensagem

    return True, "Cadastro válido."


def validar_dados_produto(nome, quantidade, preco):
    valido, mensagem = validar_produto(nome)

    if not valido:
        return False, mensagem

    valido, mensagem = validar_quantidade(quantidade)

    if not valido:
        return False, mensagem

    valido, mensagem = validar_preco(preco)

    if not valido:
        return False, mensagem

    return True, "Produto válido."


def validar_movimentacao(quantidade):
    return validar_quantidade_movimentacao(quantidade)