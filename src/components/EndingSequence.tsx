import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { assetUrl } from '../game/assets';
import { audio } from '../game/audio';
import { AUDIO_CUES, ENDING_HOLD_MS, ENDING_MS, TITLE_CARD_AT, progressIn as pr, sceneAt, subtitleAt } from '../game/ending';
import { TITLE } from '../game/text';
import { RoomView } from './SceneDecor';

// 第1章ラストシーン（約28秒）。全場面を1本の時刻 t から描く（一時停止・スキップ・検証が確実にできる）。
// 書斎Bは書斎Aと同じ背景・同じ時計本体（RoomView）。違い（時計00:14・赤い本・写真）は強調しない。
// 真相は語らない。

/** 画面が見えている間だけ進む時計（requestAnimationFrame） */
function useTimeline(onTick: (t: number) => void) {
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(document.visibilityState === 'hidden');
  const tick = useRef(onTick);
  tick.current = onTick;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const loop = (now: number) => {
      if (document.visibilityState === 'visible') {
        elapsed += Math.min(250, now - last); // 隠れていた間・極端な遅れは進めない
        setT(elapsed);
        tick.current(elapsed);
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVis = () => {
      setPaused(document.visibilityState === 'hidden');
      last = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return { t, paused };
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const ease = (p: number) => p * p * (3 - 2 * p);

export function EndingSequence({ onDone }: { onDone: () => void }) {
  const reduce = document.documentElement.dataset.reducedMotion === 'true';
  const lastT = useRef(-1);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  const { t, paused } = useTimeline((now) => {
    // 音の合図：前回から今回までに通過したものを鳴らす
    for (const c of AUDIO_CUES) {
      if (c.at > lastT.current && c.at <= now) {
        if (c.kind === 'bgm' && c.key) audio.setBgm(c.key);
        if (c.kind === 'stopBgm') audio.setBgm(null, 0.6);
        if (c.kind === 'sfx' && c.key) audio.playSfx(c.key, 0);
        if (c.kind === 'stopSfx' && c.key) audio.stopSfx(c.key, 0.5);
      }
    }
    lastT.current = now;
    if (now >= ENDING_MS + ENDING_HOLD_MS) finish();
  });

  useEffect(
    () => () => {
      audio.stopSfx('footsteps_hallway', 0.3);
      audio.stopSfx('door_open', 0.3);
    },
    [],
  );

  const scene = sceneAt(t);
  const sub = subtitleAt(t);
  const z = (v: number) => (reduce ? 1 : v);

  // 通路 → 突き当たりの扉（0〜11秒）：一人称でゆっくり前へ。扉の隙間の灯りが強まり、扉が開いて光に包まれる
  const hallScale = t < 5000 ? lerp(1, 1.35, ease(pr(t, 0, 5000))) : lerp(1.35, 2.6, ease(pr(t, 5000, 10500)));
  const hallStyle: CSSProperties = {
    opacity: 1 - pr(t, 11000, 12000),
    transform: `scale(${z(hallScale)}) translateY(${reduce ? 0 : Math.sin(t / 420) * 0.25}%)`,
    transformOrigin: '50% 44%',
  };
  const glow = pr(t, 5500, 9000);
  const doorLight = pr(t, 8600, 11000);
  // 書斎B 北（11〜17秒）
  const northStyle: CSSProperties = {
    opacity: pr(t, 11000, 12200) * (1 - pr(t, 17000, 18000)),
    transform: `scale(${z(lerp(1.04, 1, ease(pr(t, 11000, 17000))))})`,
  };
  // 書斎B 東の時計へ（17〜23秒）
  const eastStyle: CSSProperties = {
    opacity: pr(t, 17000, 18000),
    transform: `translateX(${reduce ? 0 : lerp(8, 0, ease(pr(t, 17000, 18200)))}%) scale(${z(lerp(1, 2.7, ease(pr(t, 17600, 22200))))})`,
    transformOrigin: '32.2% 23.6%',
  };
  const fade = pr(t, 23000, 24500);
  const card = pr(t, TITLE_CARD_AT, TITLE_CARD_AT + 1200);

  return (
    <div
      className={`ending${paused ? ' is-paused' : ''}`}
      data-testid="ending"
      data-scene={scene}
      data-t={Math.round(t / 100) * 100}
      onClick={() => t >= ENDING_MS && finish()}
    >
      <button type="button" className="ghost-btn skip-btn" onClick={finish}>
        スキップ
      </button>
      <div className="ending-stage">
        {t < 12000 && (
          <div className="ending-layer" style={hallStyle}>
            <img className="stage-bg" src={assetUrl('bg/hallway.webp')} alt="" />
            {/* 突き当たりの扉の下から漏れる暖かい光 */}
            <div className="far-door-glow" style={{ opacity: glow * 0.9 }} />
            <div className="far-door-light" style={{ opacity: doorLight, transform: `scaleX(${lerp(0.05, 1, doorLight)})` }} />
          </div>
        )}
        {t >= 10500 && t < 18200 && (
          <div className="ending-layer" style={northStyle} data-ending-room="B-north">
            <RoomView room="B" facing="north" className="fill-view" />
          </div>
        )}
        {t >= 16800 && (
          <div className="ending-layer" style={eastStyle} data-ending-room="B-east">
            <RoomView room="B" facing="east" className="fill-view" />
          </div>
        )}
        <div className="ending-black" style={{ opacity: fade }} />
      </div>

      {card > 0 && (
        <div className="ending-card" style={{ opacity: card }} data-testid="ending-card">
          <p className="ending-title">『{TITLE}』</p>
          <p className="ending-chapter">第1章 完</p>
          <p className="ending-tag">「本当の事件は、まだ始まっていない。」</p>
        </div>
      )}

      <p className="ending-sub" aria-live="polite" data-testid="ending-sub">
        {sub ?? ''}
      </p>
      {t >= ENDING_MS && (
        <button type="button" className="primary-btn ending-next" onClick={finish}>
          クリア画面へ
        </button>
      )}
    </div>
  );
}
