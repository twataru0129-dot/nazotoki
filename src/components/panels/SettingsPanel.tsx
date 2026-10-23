import { useState } from 'react';
import { audio } from '../../game/audio';
import { AUDIO_CHANNEL_LABEL, AUDIO_CHANNELS, type Settings } from '../../game/settings';
import { useGame } from '../../game/store';

const MOTION: [Settings['reducedMotion'], string][] = [
  ['system', '端末の設定に合わせる'],
  ['on', '動きを減らす'],
  ['off', '通常'],
];

export function SettingsPanel() {
  const { state, dispatch } = useGame();
  const s = state.settings;
  const [confirmTitle, setConfirmTitle] = useState(false);
  const set = (next: Settings) => {
    audio.unlock();
    dispatch({ type: 'setSettings', settings: next });
  };

  return (
    <div className="settings">
      <fieldset>
        <legend>音量</legend>
        {AUDIO_CHANNELS.map((ch) => (
          <div key={ch} className="volume-row">
            <label htmlFor={`vol-${ch}`}>{AUDIO_CHANNEL_LABEL[ch]}</label>
            <input
              id={`vol-${ch}`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(s.volume[ch] * 100)}
              disabled={s.muted[ch]}
              onChange={(e) => set({ ...s, volume: { ...s.volume, [ch]: Number(e.target.value) / 100 } })}
              onPointerUp={() => ch === 'sfx' && audio.playSfx('paper_turn', 300)}
            />
            <button
              type="button"
              className={`toggle${s.muted[ch] ? ' is-on' : ''}`}
              aria-pressed={s.muted[ch]}
              onClick={() => set({ ...s, muted: { ...s.muted, [ch]: !s.muted[ch] } })}
            >
              {s.muted[ch] ? 'ミュート中' : 'ミュート'}
            </button>
          </div>
        ))}
        <p className="description">音が出なくても、すべての謎は画面の情報だけで解ける。</p>
      </fieldset>

      <fieldset>
        <legend>アニメーション</legend>
        {MOTION.map(([v, label]) => (
          <label key={v} className="radio">
            <input type="radio" name="motion" checked={s.reducedMotion === v} onChange={() => set({ ...s, reducedMotion: v })} />
            {label}
          </label>
        ))}
      </fieldset>

      <p className="description small">設定はこの端末のブラウザに保存される。ブラウザのデータを消去したり、プライベートモードで遊んだりすると保存されないことがある。</p>

      <fieldset className="credits">
        <legend>クレジット</legend>
        <p className="description small">
          音楽（BGM）：Suno で生成
          <br />
          効果音・環境音：Runway で生成
          <br />
          フォント：Noto Serif JP（SIL Open Font License 1.1）
        </p>
      </fieldset>

      {state.screen === 'explore' &&
        (confirmTitle ? (
          <div className="confirm">
            <p>タイトルへ戻りますか？　進行は自動で保存されていて、「つづきから」で再開できる。</p>
            <div className="confirm-row">
              <button type="button" className="ghost-btn" onClick={() => setConfirmTitle(false)}>
                やめる
              </button>
              <button type="button" className="primary-btn" onClick={() => dispatch({ type: 'toTitle' })}>
                タイトルへ戻る
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="ghost-btn wide" onClick={() => setConfirmTitle(true)}>
            タイトルへ戻る
          </button>
        ))}
    </div>
  );
}
