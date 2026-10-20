import { deserializeWorkspaceProject, serializeWorkspaceProject } from '@/utils/cloudProject'
import type { WorkspaceProject } from '@/utils/workspaceDb'

describe('cloud project serialization', () => {
  const project: WorkspaceProject = {
    id: '750e8400-e29b-41d4-a716-446655440000',
    name: 'Exemplo',
    createdAt: 10,
    updatedAt: 20,
    tabs: [{ id: 'tab-1', name: 'main.py', code: 'print(1)', output: '', hasError: false, plots: [] }],
    activeTabId: 'tab-1',
    mode: 'script',
    settings: { layout: 'right', fontSize: 14 },
    cells: [{ id: 'cell-1', code: 'print(1)', output: '', hasError: false, plots: [] }],
    history: [],
    completedLessons: [],
    packages: [],
    backupFiles: [{ path: '/workspace/data.bin', data: Uint8Array.from([0, 1, 127, 255]) }],
    lastBackupAt: 20,
  }

  it('serializes virtual file bytes as JSON-safe numbers and restores them', () => {
    const serialized = serializeWorkspaceProject(project)
    expect(serialized.backupFiles[0].data).toEqual([0, 1, 127, 255])

    const restored = deserializeWorkspaceProject(serialized, '2026-10-20T12:00:00.000Z')
    expect(restored?.backupFiles[0].data).toBeInstanceOf(Uint8Array)
    expect(Array.from(restored?.backupFiles[0].data ?? [])).toEqual([0, 1, 127, 255])
    expect(restored?.updatedAt).toBe(Date.parse('2026-10-20T12:00:00.000Z'))
  })

  it('rejects payloads without the project collections required by the workspace', () => {
    expect(deserializeWorkspaceProject({ id: project.id, name: project.name, tabs: [] })).toBeNull()
    expect(deserializeWorkspaceProject(null)).toBeNull()
  })
})
