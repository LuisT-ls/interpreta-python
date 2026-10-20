'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { indentWithTab } from '@codemirror/commands'
import { Compartment, type Extension } from '@codemirror/state'
import { Decoration, EditorView, keymap } from '@codemirror/view'
import { FindReplaceBar } from './FindReplaceBar'

interface PythonEditorProps {
  code: string
  onChange: (code: string) => void
  disabled?: boolean
  fileName?: string
  errorLine?: number | null
  errorFocusRequest?: number
  onRun?: () => void
  fontSize?: number
}

interface SearchMatch {
  index: number
  length: number
}

function findMatches(code: string, term: string, matchCase: boolean, wholeWord: boolean): SearchMatch[] {
  if (!term) return []

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
  const regex = new RegExp(pattern, matchCase ? 'g' : 'gi')
  const matches: SearchMatch[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(code)) !== null) {
    matches.push({ index: match.index, length: match[0].length })
    if (match[0].length === 0) regex.lastIndex += 1
  }

  return matches
}

export function PythonEditor({
  code,
  onChange,
  disabled = false,
  fileName = 'editor.py',
  errorLine,
  errorFocusRequest = 0,
  onRun,
  fontSize = 14,
}: PythonEditorProps) {
  const editorRef = useRef<EditorView | null>(null)
  const latestSearchMatches = useRef<SearchMatch[]>([])
  const latestMatchIndex = useRef(0)
  const searchCompartment = useMemo(() => new Compartment(), [])
  const errorCompartment = useMemo(() => new Compartment(), [])
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace' | null>(null)
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [currentMatch, setCurrentMatch] = useState<{ index: number; count: number }>()
  const [searchTerm, setSearchTerm] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const updateTheme = () => setIsDark(root.classList.contains('dark'))
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    latestSearchMatches.current = searchMatches
  }, [searchMatches])

  useEffect(() => {
    latestMatchIndex.current = currentMatchIndex
  }, [currentMatchIndex])

  const goToMatch = useCallback((index: number, focus = true) => {
    const view = editorRef.current
    const match = latestSearchMatches.current[index]
    if (!view || !match) return

    view.dispatch({
      selection: { anchor: match.index, head: match.index + match.length },
      effects: EditorView.scrollIntoView(match.index, { y: 'center' }),
      userEvent: 'select.search',
    })
    if (focus) view.focus()
  }, [])

  const openFind = useCallback(() => {
    setFindReplaceMode('find')
    return true
  }, [])

  const openReplace = useCallback(() => {
    setFindReplaceMode('replace')
    return true
  }, [])

  const nextMatch = useCallback((direction: 1 | -1) => {
    const matches = latestSearchMatches.current
    if (!findReplaceMode || matches.length === 0) return false
    const nextIndex = (latestMatchIndex.current + direction + matches.length) % matches.length
    setCurrentMatchIndex(nextIndex)
    setCurrentMatch({ index: nextIndex + 1, count: matches.length })
    goToMatch(nextIndex)
    return true
  }, [findReplaceMode, goToMatch])

  const keyBindings = useMemo(() => keymap.of([
    { key: 'Mod-f', run: openFind },
    { key: 'Mod-h', run: openReplace },
    { key: 'Mod-Enter', run: () => { onRun?.(); return true } },
    { key: 'F3', run: () => nextMatch(1) },
    { key: 'Shift-F3', run: () => nextMatch(-1) },
    indentWithTab,
  ]), [openFind, openReplace, onRun, nextMatch])

  const handleFind = useCallback((term: string, caseSensitive: boolean, exactWord: boolean) => {
    setSearchTerm(term)
    setMatchCase(caseSensitive)
    setWholeWord(exactWord)
    const matches = findMatches(code, term, caseSensitive, exactWord)
    setSearchMatches(matches)

    if (matches.length === 0) {
      setCurrentMatchIndex(0)
      setCurrentMatch({ index: 0, count: 0 })
      return
    }

    const index = currentMatchIndex >= matches.length ? 0 : currentMatchIndex
    setCurrentMatchIndex(index)
    setCurrentMatch({ index: index + 1, count: matches.length })
    latestSearchMatches.current = matches
    latestMatchIndex.current = index
    goToMatch(index)
  }, [code, currentMatchIndex, goToMatch])

  useEffect(() => {
    if (!findReplaceMode || !searchTerm) return
    const matches = findMatches(code, searchTerm, matchCase, wholeWord)
    setSearchMatches(matches)
    latestSearchMatches.current = matches
    const nextIndex = matches.length ? Math.min(currentMatchIndex, matches.length - 1) : 0
    setCurrentMatchIndex(nextIndex)
    latestMatchIndex.current = nextIndex
    setCurrentMatch(matches.length ? { index: nextIndex + 1, count: matches.length } : { index: 0, count: 0 })
  }, [code, findReplaceMode, searchTerm, matchCase, wholeWord, currentMatchIndex])

  const handleReplace = useCallback((
    term: string,
    replacement: string,
    caseSensitive: boolean,
    exactWord: boolean,
    replaceAll: boolean,
  ) => {
    const matches = findMatches(code, term, caseSensitive, exactWord)
    if (matches.length === 0) return

    let updatedCode = code
    if (replaceAll) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = exactWord ? `\\b${escaped}\\b` : escaped
      updatedCode = code.replace(new RegExp(pattern, caseSensitive ? 'g' : 'gi'), replacement)
      setCurrentMatchIndex(0)
    } else {
      const match = matches[Math.min(currentMatchIndex, matches.length - 1)]
      updatedCode = code.slice(0, match.index) + replacement + code.slice(match.index + match.length)
    }

    onChange(updatedCode)
    window.setTimeout(() => {
      const nextMatches = findMatches(updatedCode, term, caseSensitive, exactWord)
      setSearchMatches(nextMatches)
      latestSearchMatches.current = nextMatches
      if (nextMatches.length > 0) {
        const index = replaceAll ? 0 : Math.min(currentMatchIndex, nextMatches.length - 1)
        setCurrentMatchIndex(index)
        latestMatchIndex.current = index
        setCurrentMatch({ index: index + 1, count: nextMatches.length })
        goToMatch(index)
      } else {
        setCurrentMatchIndex(0)
        latestMatchIndex.current = 0
        setCurrentMatch({ index: 0, count: 0 })
      }
    }, 0)
  }, [code, currentMatchIndex, goToMatch, onChange])

  useEffect(() => {
    const view = editorRef.current
    if (!view) return
    const ranges = searchMatches.map((match, index) =>
      Decoration.mark({
        class: index === currentMatchIndex ? 'cm-python-search-current' : 'cm-python-search-match',
      }).range(match.index, match.index + match.length),
    )
    view.dispatch({ effects: searchCompartment.reconfigure(EditorView.decorations.of(Decoration.set(ranges, true))) })
  }, [editorReady, searchMatches, currentMatchIndex, searchCompartment])

  useEffect(() => {
    const view = editorRef.current
    if (!view) return
    const line = errorLine && errorLine > 0 && errorLine <= view.state.doc.lines
      ? view.state.doc.line(errorLine)
      : null
    const errorExtension: Extension = line
      ? EditorView.decorations.of(Decoration.set([Decoration.line({ class: 'cm-python-error-line' }).range(line.from)]))
      : []
    view.dispatch({ effects: errorCompartment.reconfigure(errorExtension) })
    if (line && errorFocusRequest > 0) {
      view.dispatch({ selection: { anchor: line.from }, effects: EditorView.scrollIntoView(line.from, { y: 'center' }) })
      view.focus()
    }
  }, [editorReady, errorLine, errorFocusRequest, errorCompartment])

  const handleEditorCreated = useCallback((view: EditorView) => {
    editorRef.current = view
    setEditorReady(true)
  }, [])

  const editorTheme = useMemo(() => EditorView.theme({
    '&': { height: '100%', fontSize: `${fontSize}px` },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
    '.cm-content': { minHeight: '100%', padding: '16px 12px' },
    '.cm-gutters': { minHeight: '100%' },
    '.cm-python-search-match': { backgroundColor: isDark ? 'rgba(202, 138, 4, .42)' : 'rgba(253, 224, 71, .55)' },
    '.cm-python-search-current': { backgroundColor: isDark ? 'rgba(234, 179, 8, .65)' : 'rgba(250, 204, 21, .75)', outline: '1px solid #ca8a04' },
    '.cm-python-error-line': { backgroundColor: isDark ? 'rgba(239, 68, 68, .13)' : 'rgba(239, 68, 68, .10)' },
  }, { dark: isDark }), [fontSize, isDark])

  const editorExtensions = useMemo(() => [
    python(),
    keyBindings,
    EditorView.contentAttributes.of({ 'aria-label': `Editor de código Python ${fileName}`, spellcheck: 'false' }),
    searchCompartment.of([]),
    errorCompartment.of([]),
    editorTheme,
  ], [keyBindings, fileName, searchCompartment, errorCompartment, editorTheme])

  const closeFindReplace = useCallback(() => {
    setFindReplaceMode(null)
    setSearchMatches([])
    setSearchTerm('')
    latestSearchMatches.current = []
    setCurrentMatch(undefined)
    setCurrentMatchIndex(0)
    latestMatchIndex.current = 0
  }, [])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {findReplaceMode && (
        <FindReplaceBar
          code={code}
          onFind={handleFind}
          onReplace={handleReplace}
          onClose={closeFindReplace}
          mode={findReplaceMode}
          currentMatch={currentMatch}
        />
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={code}
          onChange={onChange}
          onCreateEditor={handleEditorCreated}
          extensions={editorExtensions}
          theme={isDark ? 'dark' : 'light'}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, highlightActiveLineGutter: true, tabSize: 4 }}
          indentWithTab
          editable={!disabled}
          readOnly={disabled}
          height="100%"
          placeholder="Digite seu código Python aqui..."
          className={disabled ? 'opacity-60' : ''}
        />
      </div>
    </div>
  )
}
