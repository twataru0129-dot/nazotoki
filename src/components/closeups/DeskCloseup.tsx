import { useId } from 'react';
import { DRAWERS, type DrawerId } from '../../game/logic';
import { useGame } from '../../game/store';
import { useFreshFx, useFreshFxSuffix } from '../../game/useFreshFx';
import { DRAWER_LABELS } from '../../game/text';
import { KeyIcon } from '../art/KeyIcon';
import { Examine } from '../Examine';

const POS: Record<DrawerId, string> = { left: '左', middle: '中央', right: '右' };

/** 札の文言を「鍵は／中央に（は）／ある・ない」の文節に分ける。狭い画面でも文節の途中では改行しない（文言は変えない） */
function phrases(text: string): string[] {
  const m = text.match(/^(鍵は)(.*?に(?:は)?)(.*)$/);
  return m ? m.slice(1) : [text];
}

/** 真鍮の吊り手（バイルハンドル）。左右の座金から弓形の取っ手が下がる */
function DrawerPull() {
  const g = `pull-${useId().replace(/:/g, '')}`;
  return (
    <svg className="drawer-pull" viewBox="0 0 96 40" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3dca0" />
          <stop offset=".5" stopColor="#c09550" />
          <stop offset="1" stopColor="#6e4e22" />
        </linearGradient>
      </defs>
      {/* 座金 */}
      <ellipse cx="14" cy="10" rx="11" ry="8" fill={`url(#${g})`} stroke="#5a3d17" strokeWidth="1.2" />
      <ellipse cx="82" cy="10" rx="11" ry="8" fill={`url(#${g})`} stroke="#5a3d17" strokeWidth="1.2" />
      <circle cx="14" cy="10" r="2.4" fill="#4a3114" />
      <circle cx="82" cy="10" r="2.4" fill="#4a3114" />
      {/* 弓形の取っ手（影→本体） */}
      <path d="M14 13 Q48 44 82 13" fill="none" stroke="#1a0f06" strokeWidth="6" strokeLinecap="round" opacity=".55" transform="translate(0 2)" />
      <path d="M14 13 Q48 44 82 13" fill="none" stroke={`url(#${g})`} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

// 机の前面：3つの引き出しを左・中央・右に横並びで置く（背景の机と同じ並び）。
// 札の文言・正解（右）・鍵・「II」の刻印は従来どおり。机上の小箱と写真は別の拡大画面（BoxCloseup・PhotoCloseup）。
export function DeskCloseup() {
  const { state, dispatch } = useGame();
  const { rightOpen, key } = state.progress.desk;
  const shake = useFreshFxSuffix('drawer-locked-');
  const drawerAnim = useFreshFx('drawer-open', 'desk-drawer');

  return (
    <>
      <div className="desk-front">
        <div className="desk-top-edge" aria-hidden="true" />
        <ol className="drawers" aria-label="3つの引き出し（左から 左・中央・右）">
          {DRAWERS.map((d) => {
            const open = d === 'right' && rightOpen;
            return (
              <li key={d} className={`drawer${open ? ' is-open' : ''}${open && drawerAnim ? ' animate-drawer' : ''}`} data-drawer-pos={d}>
                <button
                  type="button"
                  className={`drawer-front${shake === d ? ' shake' : ''}`}
                  key={shake === d ? `s${state.fx?.n}` : d}
                  onClick={() => dispatch({ type: 'openDrawer', id: d })}
                  aria-label={`${POS[d]}の引き出し「${DRAWER_LABELS[d]}」${open ? '（開いている）' : 'を開ける'}`}
                  data-drawer={d}
                >
                  <span className="drawer-pos">{POS[d]}</span>
                  <span className="label-plate">
                    <span className="drawer-label">
                      {phrases(DRAWER_LABELS[d]).map((w) => (
                        <span key={w} className="phrase">
                          {w}
                        </span>
                      ))}
                    </span>
                  </span>
                  <DrawerPull />
                </button>
                {open && (
                  <div className="drawer-inside">
                    {key === 'unfound' ? (
                      <button type="button" className="key-pick" onClick={() => dispatch({ type: 'takeKey' })} aria-label="小さな鍵を取る">
                        <KeyIcon />
                        <span>取る</span>
                      </button>
                    ) : (
                      <span className="behind-empty">{key === 'used' ? '鍵は木箱に使った。' : '鍵は持っている。'}</span>
                    )}
                    {/* 任意調査O4：引き出しの底の「II」の刻印 */}
                    <Examine id="O4" label="引き出しの底を調べる" className="engraving">
                      <span aria-hidden="true">II</span>
                    </Examine>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {!rightOpen && <p className="op-help">開けたい引き出しをタップする。開かない引き出しを選んでも何も失わない。</p>}
    </>
  );
}
