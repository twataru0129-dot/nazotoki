import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../game/assets';
import { audio } from '../game/audio';
import { useGame } from '../game/store';
import { DoorDevice } from './art/DoorDevice';

// 「先へ進む」の扉演出（オリジナル）。暗闇に古い木の扉が浮かび、真鍮のノブがゆっくり回り、
// 重い扉がきしみながら奥へ開いて、暗い通路が見える。BGMは止め、扉の音だけを際立たせる。
// 扉の絵は書斎Aの閉じた扉と同じ画像から切り出したもの（fx/door_frame・fx/door_leaf）。
// 再利用できるよう、終わったら onDone を呼ぶだけの部品にしている（第5段階でエンディングに接続）。
//
//  0.0〜1.8秒 暗闇から扉が浮かぶ
//  1.8〜3.2秒 ノブが回る（2.2秒から door_open のきしみ）
//  3.0〜7.0秒 扉が奥へ開き、通路の明かりが差す
//  7.0〜9.2秒 通路へ踏み込む（7.2秒から footsteps_hallway）→ 暗転
export const DOOR_TRANSITION_MS = 9600;
const REDUCED_MS = 4200;

export function DoorTransition({ onDone }: { onDone: () => void }) {
  const { state } = useGame();
  const reduce = document.documentElement.dataset.reducedMotion === 'true';
  const [paused, setPaused] = useState(document.visibilityState === 'hidden');
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    audio.stopSfx('door_open', 0.4);
    audio.stopSfx('footsteps_hallway', 0.4);
    onDone();
  };

  // 時刻表（ms）。アプリが隠れている間は止め、戻ったら残りから続ける
  useEffect(() => {
    audio.setBgm(null, 0.6);
    audio.setAmbient(null);
    audio.setOldHouse(false);
    const cues: [number, () => void][] = [
      [reduce ? 300 : 2200, () => audio.playSfx('door_open', 0)],
      [reduce ? 2200 : 7200, () => audio.playSfx('footsteps_hallway', 0)],
      [reduce ? REDUCED_MS : DOOR_TRANSITION_MS, finish],
    ];
    let elapsed = 0;
    let startedAt = performance.now();
    let timers: number[] = [];
    const schedule = () => {
      startedAt = performance.now();
      timers = cues.filter(([at]) => at >= elapsed).map(([at, fn]) => window.setTimeout(fn, at - elapsed));
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        elapsed += performance.now() - startedAt;
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
        setPaused(true);
      } else {
        setPaused(false);
        schedule();
      }
    };
    schedule();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`door-transition${reduce ? ' is-reduced' : ''}${paused ? ' is-paused' : ''}`} data-testid="door-transition">
      <button type="button" className="ghost-btn skip-btn" onClick={finish}>
        スキップ
      </button>
      <div className="dt-stage">
        <div className="dt-push">
          <img className="dt-hall" src={assetUrl('bg/hallway.webp')} alt="" />
          <div className="dt-leaf">
            <img src={assetUrl('fx/door_leaf.webp')} alt="" />
            {/* 探索画面と同じ謎用の装置（解錠済み：枠にカード） */}
            <DoorDevice dialMinutes={state.progress.door.dialMinute} filled className="dt-device" />
            {/* 真鍮のノブ（描き込みのレバーを覆い、ゆっくり回る） */}
            <svg className="dt-knob" viewBox="0 0 80 160" aria-hidden="true">
              <defs>
                <radialGradient id="dt-brass" cx=".35" cy=".35" r=".8">
                  <stop offset="0" stopColor="#fff1c2" />
                  <stop offset=".45" stopColor="#c99b4a" />
                  <stop offset="1" stopColor="#5e3f17" />
                </radialGradient>
              </defs>
              <rect x="22" y="6" width="36" height="148" rx="10" fill="#7a5527" stroke="#d8b06a" strokeWidth="2" />
              <path d="M40 116 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M38 120 h4 v14 h-4 z" fill="#1e1309" />
              <g className="dt-knob-turn">
                <circle cx="40" cy="62" r="24" fill="url(#dt-brass)" stroke="#6b4a1c" strokeWidth="2" />
                <path d="M40 42 V82 M20 62 H60" stroke="#8a6224" strokeWidth="2" opacity=".55" />
                <circle cx="40" cy="62" r="6" fill="#e9c77d" />
              </g>
            </svg>
          </div>
          <img className="dt-frame" src={assetUrl('fx/door_frame_hole.webp')} alt="" />
          <div className="dt-light" />
        </div>
      </div>
      <p className="dt-caption" aria-live="polite">
        扉の向こうへ――
      </p>
    </div>
  );
}
