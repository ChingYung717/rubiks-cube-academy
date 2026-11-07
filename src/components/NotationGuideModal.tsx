import React, { useEffect, useRef } from 'react';
import { Keyboard, MousePointerClick, X } from 'lucide-react';

interface NotationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NOTATION_ITEMS = [
  { token: 'R / R\' / R2', name: 'Right 右层', desc: 'R 为右手向上推 90°；R\' 为向下拉 90°；R2 为转 180°' },
  { token: 'U / U\' / U2', name: 'Up 顶层', desc: 'U 为右手食指向左拨 90°；U\' 为左手食指向右拨 90°' },
  { token: 'F / F\' / F2', name: 'Front 前层', desc: '正对前面：F 为顺时针向右下方压 90°；F\' 为逆时针挑回' },
  { token: 'L / L\' / L2', name: 'Left 左层', desc: '正对左面：L 为左手向下拉 90°；L\' 为向上推 90°' },
  { token: 'D / D\' / D2', name: 'Down 底层', desc: 'D 为底层从左向右拨 90°；D\' 为从右向左拨 90°' },
  { token: 'B / B\' / B2', name: 'Back 后层', desc: '正对背面：B 顺时针转 90°（正面看顶边左拨）；B\' 逆时针转 90°' },
  { token: 'M / M\' / M2', name: 'Middle 中层', desc: '左右之间的夹层，方向跟随左层 (L) 下拉 90°，M2 常用于 H-Perm' },
  { token: 'E / E\' / E2', name: 'Equator 赤道层', desc: '顶底之间的水平夹层，方向跟随底层 (D) 从左向右拨 90°' },
  { token: 'S / S\' / S2', name: 'Standing 中立层', desc: '前后之间的夹层，方向跟随前层 (F) 顺时针右压 90°' },
  { token: 'r l u d f b / Rw..Bw', name: 'Wide 双层宽转', desc: '同时带动外层与相邻中层旋转（方向分别同 R L U D F B），用于公式解析与演示' },
  { token: 'x / y / z', name: '整体翻转', desc: '整颗魔方分别沿 R 方向(x)、U 方向(y)、F 方向(z) 整体旋转' },
];

export const NotationGuideModal: React.FC<NotationGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      data-testid="notation-guide-modal"
      aria-labelledby="notation-guide-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-2xl bg-transparent p-0 text-slate-100 select-none backdrop:bg-black/75"
    >
      <div className="w-full max-w-2xl bg-[#0e1526] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 id="notation-guide-title" className="text-base font-bold text-white">
              国际魔方转动符号 (WCA Notation) & 交互操控指南
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              适用所有三阶层先法与 CFOP 速拧公式 · 区分公式解析、鼠标拖拽与键盘快捷键范围
            </p>
          </div>
          <button
            ref={closeRef}
            aria-label="关闭符号速查"
            onClick={onClose}
            data-testid="btn-close-guide"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Notation Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2.5">
              1. 国际通用公式符号表（引擎全部支持解析）
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {NOTATION_ITEMS.map((item) => (
                <div
                  key={item.token}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-sm font-extrabold text-cyan-300">
                      {item.token}
                    </code>
                    <span className="text-xs font-semibold text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Mouse & Keyboard Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <MousePointerClick className="w-4 h-4" />
                <span>鼠标 / 触控派发范围</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                • <strong>3D 拖拽拨层</strong>：在色块上按住滑动可派发外层 <code className="text-cyan-300">R L U D F B</code> 与夹层 <code className="text-cyan-300">M E S</code> 的顺/逆时针 90° 转动；2D 展开图点击可顺时针转对应外层。
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                • <strong>旋转 3D 视角</strong>：在空白背景处拖拽或点击右上角预设视角按钮 360° 观察（不派发双层宽转或整体翻转记号）。
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Keyboard className="w-4 h-4" />
                <span>键盘快捷键范围（非控件焦点时生效）</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                • 单层转动 <code className="text-cyan-300">R L U D F B M</code>：顺时针转 90°；按住 <code className="text-cyan-300">Shift</code> 逆时针转 90°（加 <code className="text-cyan-300">'</code>）。
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                • 整体翻转 <code className="text-cyan-300">X Y Z</code>：执行 <code className="text-cyan-300">x y z</code>（配 <code className="text-cyan-300">Shift</code> 逆向；课程跟练模式下禁用以固定方位基准）。<code className="text-cyan-300">E / S</code> 与宽转不设快捷键。
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                • <code className="text-cyan-300">Space (空格键)</code>：演示模式播放/暂停；自由练习生成计时打乱后启动或取消本轮计时。
              </p>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
};
