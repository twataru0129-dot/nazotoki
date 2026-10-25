import { useCallback } from 'react';
import { useGame } from '../game/store';
import { Modal } from './Modal';
import { InventoryPanel } from './panels/InventoryPanel';
import { LetterPanel } from './panels/LetterPanel';
import { NotebookPanel } from './panels/NotebookPanel';
import { SettingsPanel } from './panels/SettingsPanel';

const TITLES = { inventory: '持ち物', notebook: '事件調査手帳', settings: '設定', letter: '城戸の手紙' } as const;

/** 重ねる画面は常に1つだけ（モーダルを積み重ねない） */
export function OverlayHost() {
  const { state, dispatch } = useGame();
  const close = useCallback(() => dispatch({ type: 'closeOverlay' }), [dispatch]);
  if (!state.overlay) return null;
  const id = state.overlay;
  return (
    <Modal title={TITLES[id]} onClose={close} testId={`overlay-${id}`}>
      {id === 'inventory' && <InventoryPanel />}
      {id === 'notebook' && <NotebookPanel />}
      {id === 'settings' && <SettingsPanel />}
      {id === 'letter' && <LetterPanel />}
    </Modal>
  );
}
