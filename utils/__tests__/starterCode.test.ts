import { DEFAULT_STARTER_CODE, migrateStarterCode } from '@/utils/starterCode'

const legacyStarterCode = `# Bem-vindo ao Interpretador Python Web!
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

describe('migrateStarterCode', () => {
  it('atualiza somente o template inicial antigo intacto', () => {
    expect(migrateStarterCode(legacyStarterCode)).toBe(DEFAULT_STARTER_CODE)
  })

  it('preserva o código personalizado do usuário', () => {
    const editedCode = `${legacyStarterCode}\n\nprint("meu código")`
    expect(migrateStarterCode(editedCode)).toBe(editedCode)
  })
})
