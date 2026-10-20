export const DEFAULT_STARTER_CODE = `# Bem-vindo ao Interpreta Python!
# Digite seu código Python aqui e clique em "Executar Código"

print("Olá, mundo!")
print("Python está funcionando! 🐍")

# Exemplo: calcular a soma de números
numeros = [1, 2, 3, 4, 5]
soma = sum(numeros)
print(f"A soma de {numeros} é {soma}")

# Exemplo: loop
for i in range(3):
    print(f"Contagem: {i}")`

const LEGACY_STARTER_CODE = `# Bem-vindo ao Interpretador Python Web!
# Digite seu código Python aqui e clique em "Executar Código"

print("Olá, mundo!")
print("Python está funcionando! 🐍")

# Exemplo: calcular a soma de números
numeros = [1, 2, 3, 4, 5]
soma = sum(numeros)
print(f"A soma de {numeros} é {soma}")

# Exemplo: loop
for i in range(3):
    print(f"Contagem: {i}")`

/** Atualiza apenas o template antigo intacto; qualquer edição do usuário é preservada. */
export function migrateStarterCode(code: string): string {
  return code === LEGACY_STARTER_CODE ? DEFAULT_STARTER_CODE : code
}
