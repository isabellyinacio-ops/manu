DESCRIBE usuarios;
DESCRIBE produto;
DESCRIBE categoria;
DESCRIBE entrada_estoque;
DESCRIBE saida_estoque;

DESCRIBE produto;
ALTER TABLE produto
MODIFY categoria_id INT NULL;

SELECT * FROM usuarios
WHERE id = 5;
SELECT * FROM produto
WHERE usuario_id = 5;

DELETE FROM entrada_estoque
WHERE produto_id IN (
    SELECT id FROM produto
    WHERE usuario_id = 5
);

DELETE FROM saida_estoque
WHERE produto_id IN (
    SELECT id FROM produto
    WHERE usuario_id = 5
);

DELETE FROM produto
WHERE usuario_id = 7;

DELETE FROM categoria
WHERE usuario_id = 5;
DELETE FROM usuarios
WHERE id = 7;

SELECT * FROM usuarios
WHERE id IN (1, 6);

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'estoque_agricola'
AND REFERENCED_TABLE_NAME = 'usuarios'
AND REFERENCED_COLUMN_NAME = 'id';

SELECT * FROM usuarios
WHERE id = 1;

USE estoque_agricola;

SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- Atualizar categorias
UPDATE categoria
SET usuario_id = 1
WHERE usuario_id = 6;

-- Atualizar produtos
UPDATE produto
SET usuario_id = 1
WHERE usuario_id = 6;

-- Atualizar notificações
UPDATE notificacoes
SET usuario_id = 1
WHERE usuario_id = 6;

-- Atualizar o usuário
UPDATE usuarios
SET id = 1
WHERE id = 6;

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;


SHOW CREATE TABLE usuarios;
SHOW CREATE TABLE produto;
SHOW CREATE TABLE entrada_estoque;



SHOW CREATE TABLE produto;

SHOW INDEX FROM produto;

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'estoque_agricola'
AND TABLE_NAME IN ('produto', 'entrada_estoque');



SHOW TABLES;
DESCRIBE pedido_compra;
DESCRIBE item_pedido_compra;