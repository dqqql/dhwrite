import React from 'react'
import { MapCanvas } from '@/components/map/MapCanvas'
import { TopBar } from '@/components/layout/TopBar'
import { PlayerPanel } from '@/components/panels/PlayerPanel'
import { HandArea } from '@/components/panels/HandArea'
import { DrawModal } from '@/components/ui/DrawModal'
import { CreateCardModal } from '@/components/ui/CreateCardModal'
import { EndCoCreationConfirm } from '@/components/ui/EndCoCreationConfirm'
import { RoomSettingsModal } from '@/components/ui/RoomSettingsModal'
import { ImportModal } from '@/components/ui/ImportModal'
import { ToastContainer } from '@/components/ui/Toast'
import { useStore } from '@/store/useStore'

export function RoomPage() {
  const { room, connectionStatus } = useStore()

  if (!room) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-secondary)',
        fontSize: 14,
      }}>
        {connectionStatus === 'connecting' ? '正在同步房间状态…' : '房间状态尚未就绪'}
        <ToastContainer />
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Top bar (z=300) */}
      <TopBar />

      {/* Main canvas area */}
      <div style={{ position: 'absolute', inset: 0, top: 52 }}>
        <MapCanvas />
      </div>

      {/* Player panel (z=100) */}
      <PlayerPanel />

      {/* Hand area (z=200) */}
      <HandArea />

      {/* Modals */}
      <DrawModal />
      <CreateCardModal />
      <EndCoCreationConfirm />
      <RoomSettingsModal />
      <ImportModal />

      {/* Toasts */}
      <ToastContainer />
    </div>
  )
}
