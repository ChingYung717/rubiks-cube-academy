import React from 'react';
import {
  BookOpen,
  Boxes,
  Eye,
  Grid,
  HelpCircle,
  Mic,
  MicOff,
  Navigation,
  Timer,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TopNavbarProps {
  workspaceMode: 'course' | 'sandbox';
  onSwitchWorkspaceMode: (mode: 'course' | 'sandbox') => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  show3DArrows: boolean;
  onToggle3DArrows: () => void;
  show2DNet: boolean;
  onToggle2DNet: () => void;
  narrationEnabled: boolean;
  onToggleNarration: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenGuideModal: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  workspaceMode,
  onSwitchWorkspaceMode,
  focusMode,
  onToggleFocusMode,
  show3DArrows,
  onToggle3DArrows,
  show2DNet,
  onToggle2DNet,
  narrationEnabled,
  onToggleNarration,
  soundEnabled,
  onToggleSound,
  onOpenGuideModal,
}) => {
  return (
    <header className="shrink-0 w-full bg-[#090d16]/95 border-b border-slate-800/90 px-2 py-1.5 grid grid-cols-1 gap-1.5 sm:px-4 md:grid-cols-[1fr_auto] xl:flex xl:items-center xl:justify-between xl:h-14 xl:gap-3 select-none z-30">
      {/* Brand Title */}
      <div className="hidden md:flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/25 via-blue-600/20 to-amber-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <Boxes className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">
              CubeLab 3D · 三维魔方交互学院
            </h1>
            <span className="hidden 2xl:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              从层先法到 CFOP
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden 2xl:block">
            3D 动画分步拆解 · 教练全程中文解说 · 目标块聚焦暗化 · 残局跟拧闯关
          </p>
        </div>
      </div>

      {/* Center Workspace Mode Switcher */}
      <div className="order-2 md:col-span-2 xl:order-none grid grid-cols-2 xl:flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => onSwitchWorkspaceMode('course')}
          data-testid="nav-mode-course"
          aria-pressed={workspaceMode === 'course'}
          className={`flex items-center justify-center gap-1.5 px-1.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            workspaceMode === 'course'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>课程 (16 课)</span>
        </button>
        <button
          onClick={() => onSwitchWorkspaceMode('sandbox')}
          data-testid="nav-mode-sandbox"
          aria-pressed={workspaceMode === 'sandbox'}
          className={`flex items-center justify-center gap-1.5 px-1.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            workspaceMode === 'sandbox'
              ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>自由练习与计时</span>
        </button>
      </div>

      {/* Right Visual & Audio Aid Toggles */}
      <div className="flex items-center justify-center flex-wrap gap-1.5">
        <button
          onClick={onToggleNarration}
          data-testid="toggle-voice-narration"
          aria-pressed={narrationEnabled}
          aria-label="中文解说"
          title="中文语音解说开关：在分步演示与跟练时自动播报中文解说词"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            narrationEnabled
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.18)]'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          {narrationEnabled ? (
            <Mic className="w-3.5 h-3.5 text-cyan-300" />
          ) : (
            <MicOff className="w-3.5 h-3.5" />
          )}
          <span className="hidden 2xl:inline">中文解说</span>
        </button>

        <button
          onClick={onToggleFocusMode}
          data-testid="toggle-focus-mode"
          aria-pressed={focusMode}
          aria-label="目标块聚焦"
          title="目标色块聚焦模式：将无关块暗化，仅高亮当前步骤关键块"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            focusMode
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.18)]'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">目标块聚焦</span>
        </button>

        <button
          onClick={onToggle3DArrows}
          data-testid="toggle-3d-arrows"
          aria-pressed={show3DArrows}
          aria-label="3D 提示箭头"
          title="3D 旋转方向提示箭头开关"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            show3DArrows
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">3D 提示箭头</span>
        </button>

        <button
          onClick={onToggle2DNet}
          data-testid="toggle-2d-net"
          aria-pressed={show2DNet}
          aria-label="2D 展开图"
          title="2D 六面实时展开图开关"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            show2DNet
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">2D 展开图</span>
        </button>

        <button
          onClick={onToggleSound}
          data-testid="toggle-sound"
          aria-pressed={soundEnabled}
          aria-label="魔方拨动音效"
          title="合成机械魔方拨动音效开关"
          className={`p-2 rounded-lg border transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onOpenGuideModal}
          data-testid="btn-open-guide"
          aria-label="符号速查"
          title="查看魔方符号图解与操作指南"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden 2xl:inline">符号速查</span>
        </button>
      </div>
    </header>
  );
};
