CREATE DATABASE IF NOT EXISTS estoque_agricola;
USE estoque_agricola;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL
);


CREATE TABLE produto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    quantidade INT,
    preco_unitario DECIMAL(10,2),
    usuario_id INT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE entrada_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,

    produto_id INT NOT NULL,

    quantidade INT NOT NULL,

    data_movimentacao DATETIME
    DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (produto_id)
    REFERENCES produto(id)
    ON DELETE CASCADE
);

CREATE TABLE saida_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,

    produto_id INT NOT NULL,

    quantidade INT NOT NULL,

    data_movimentacao DATETIME
    DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (produto_id)
    REFERENCES produto(id)
    ON DELETE CASCADE
);