import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Modal } from './Modal'
import { Upload, AlertCircle } from 'lucide-react'

export function ImportModal() {
  const { isImportModalOpen, closeImportModal, addToast } = useStore()
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file: File) {
    if (!file.name.endsWith('.dhpack.json') && !file.name.endsWith('.json')) {
      addToast('请选择 .dhpack.json 或 .json 文件', 'error')
      return
    }
    // TODO: Wire to backend once packages/shared schema is ready
    addToast(`已解析文件：${file.name}（后端接入后生效）`, 'info')
    closeImportModal()
  }

  return (
    <Modal open={isImportModalOpen} onClose={closeImportModal} title="导入卡包" maxWidth={460}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
        支持导入 <code style={{ color: 'var(--accent-violet)', background: 'var(--bg-overlay)', padding: '1px 5px', borderRadius: 4 }}>.dhpack.json</code> 格式的卡包文件，
        或单张卡牌 JSON。
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent-violet)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          textAlign: 'center',
          background: dragOver ? 'rgba(124,111,222,0.06)' : 'var(--bg-overlay)',
          transition: 'all 0.15s',
          marginBottom: 16,
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('dh-file-input')?.click()}
      >
        <Upload size={28} color={dragOver ? 'var(--accent-violet)' : 'var(--text-muted)'} style={{ margin: '0 auto 10px' }} />
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>拖拽文件至此处</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>或点击选择文件</div>
        <input
          id="dh-file-input"
          type="file"
          accept=".json,.dhpack.json"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 20 }}>
        <AlertCircle size={13} color="var(--accent-amber)" />
        <span style={{ fontSize: 12, color: 'var(--accent-amber)' }}>导入功能需要后端接入后完整生效（当前为演示模式）</span>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={closeImportModal}>取消</button>
      </div>
    </Modal>
  )
}
