import { useEffect, useRef } from 'react'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)

    // Fechar ao clicar fora do modal
    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleMouseDown)
        }

        return () => {
            document.removeEventListener('mousedown', handleMouseDown)
        }
    }, [isOpen, onClose])

    // Fechar com a tecla ESC
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
            >
                {/* Cabeçalho */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Sobre o Interpreta Python
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        aria-label="Fechar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Sobre a ferramenta
                        </h3>
                        <p className="leading-relaxed">
                            O IDE Python Online é uma ferramenta baseada na web que permite aprender, construir, executar e testar seus scripts Python diretamente no navegador.
                            Você pode escrever código, ver a saída instantaneamente e exportar seus projetos.
                            Todo o processamento é feito localmente no seu navegador usando WebAssembly (Pyodide), garantindo velocidade e privacidade.
                            Versão do Python suportada: Python 3.11+ (via Pyodide).
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Atalhos de teclado
                        </h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <li className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded">
                                <span>Executar código</span>
                                <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">Ctrl + Enter</span>
                            </li>
                            <li className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded">
                                <span>Indentação</span>
                                <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">Tab</span>
                            </li>
                            <li className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded">
                                <span>Desindentação</span>
                                <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">Shift + Tab</span>
                            </li>
                            <li className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded">
                                <span>Indentação Inteligente</span>
                                <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">Backspace (em indent)</span>
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Reportar um bug
                        </h3>
                        <p className="leading-relaxed">
                            Se você encontrar algum erro, tiver dúvidas ou sugestões de melhoria, por favor, abra uma issue no repositório do projeto ou entre em contato.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Política de dados
                        </h3>
                        <p className="leading-relaxed">
                            <strong>Nenhum código é enviado para servidores externos para execução.</strong> Todo o código é executado localmente no seu navegador.
                            O código permanece no seu dispositivo a menos que você escolha exportá-lo explicitamente.
                        </p>
                    </section>
                </div>

                {/* Rodapé */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Copyright © 2025 Interpreta Python
                    </p>
                </div>
            </div>
        </div>
    )
}
