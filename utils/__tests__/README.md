# Testes Unitários

Este diretório contém testes unitários para as funções utilitárias do projeto.

## Executando os Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (re-executa ao salvar arquivos)
npm run test:watch

# Executar testes com cobertura
npm run test:coverage
```

## Estrutura dos Testes

### `parsePyodideError.test.ts`

Testes abrangentes para a função `parsePyodideError`, que é responsável por parsear erros retornados pelo Pyodide e extrair informações relevantes como tipo de erro, linha, mensagem e traceback formatado.

#### Cobertura de Testes

- **Tipos de Erro Python**: SyntaxError, IndentationError, TabError, NameError, TypeError, ValueError, AttributeError, ZeroDivisionError, ImportError, ModuleNotFoundError, KeyError, IndexError, RecursionError, FileNotFoundError, AssertionError
- **Padrões Regex**: Diferentes formatos de traceback, múltiplas entradas de File, formatos com e sem filename
- **Mapeamento de Linhas**: Com e sem mapeamento, linha mais próxima, imports
- **Casos Edge**: Erros vazios, sem informação de linha, linha fora do range, objetos de erro com propriedades diretas
- **Formatação**: Traceback formatado, mensagens de erro, caracteres especiais

#### Exemplos de Testes

```typescript
// Teste básico de SyntaxError
it('should parse SyntaxError with line number', () => {
  const error = 'SyntaxError: invalid syntax\n  File "<exec>", line 5, in <module>'
  const code = 'print("hello")\nprint("world")\nprint("test")\nprint("foo")\nprint("bar")\n'
  const result = parsePyodideError(error, code, 'test.py')

  expect(result.type).toBe('SyntaxError')
  expect(result.isSyntaxError).toBe(true)
  expect(result.line).toBe(5)
})
```

## Adicionando Novos Testes

Para adicionar novos testes:

1. Crie um arquivo `*.test.ts` ou `*.spec.ts` no diretório apropriado
2. Importe a função a ser testada
3. Use `describe` para agrupar testes relacionados
4. Use `it` ou `test` para cada caso de teste
5. Execute `npm test` para verificar

Exemplo:

```typescript
import { minhaFuncao } from '../minhaFuncao'

describe('minhaFuncao', () => {
  it('should handle case X', () => {
    const result = minhaFuncao(input)
    expect(result).toBe(expected)
  })
})
```

