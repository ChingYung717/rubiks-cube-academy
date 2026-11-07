import React from 'react';
import {
  CUBE_COLOR_HEX,
  Cubie,
  FaceDir,
  NetSticker,
  extract2DNet,
} from '../engine/cubeEngine';
import { Grid } from 'lucide-react';

interface Cube2DNetProps {
  cube: Cubie[];
  focusMode: boolean;
  isCubieFocused: (cubie: Cubie) => boolean;
  onFaceClick?: (faceDir: FaceDir) => void;
}

export const Cube2DNet: React.FC<Cube2DNetProps> = ({
  cube,
  focusMode,
  isCubieFocused,
  onFaceClick,
}) => {
  const net = extract2DNet(cube);
  const cubieMap = new Map<string, Cubie>();
  for (const c of cube) {
    cubieMap.set(c.id, c);
  }

  const renderFaceGrid = (dir: FaceDir) => {
    const grid: NetSticker[][] = net[dir];
    return (
      <button
        type="button"
        key={dir}
        onClick={() => onFaceClick?.(dir)}
        aria-label={`顺时针转动 ${dir} 面`}
        title={`点击顺时针转动 ${dir} 面`}
        className="grid grid-cols-3 gap-[2px] p-[2px] rounded bg-slate-950 border border-slate-700/80 hover:border-cyan-400/60 transition-colors cursor-pointer"
      >
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const cubie = cubieMap.get(cell.cubieId);
            const focused = !focusMode || !cubie || isCubieFocused(cubie);
            const isCenter = rIdx === 1 && cIdx === 1;
            const bgHex = focused ? CUBE_COLOR_HEX[cell.color] : '#1e293b';
            const textColor =
              cell.color === 'Y' || cell.color === 'W' ? '#0f172a' : '#ffffff';

            return (
              <span
                key={`${dir}_${rIdx}_${cIdx}`}
                style={{
                  backgroundColor: bgHex,
                  opacity: focused ? 1 : 0.38,
                }}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[2px] flex items-center justify-center text-[8px] font-extrabold select-none transition-all duration-150"
              >
                {isCenter ? (
                  <span style={{ color: focused ? textColor : '#94a3b8' }}>{dir}</span>
                ) : null}
              </span>
            );
          })
        )}
      </button>
    );
  };

  return (
    <div
      className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 backdrop-blur-md shadow-xl select-none"
      data-testid="cube-2d-net"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
          <Grid className="w-3.5 h-3.5 text-cyan-400" />
          <span>2D 六面实时展开图</span>
        </div>
        <span className="text-[10px] text-slate-400">点击面可转动</span>
      </div>

      {/* Cross Layout: 4 columns x 3 rows */}
      <div className="grid grid-cols-4 gap-1 items-center justify-items-center">
        {/* Row 1: _ U _ _ */}
        <div />
        {renderFaceGrid('U')}
        <div />
        <div />

        {/* Row 2: L F R B */}
        {renderFaceGrid('L')}
        {renderFaceGrid('F')}
        {renderFaceGrid('R')}
        {renderFaceGrid('B')}

        {/* Row 3: _ D _ _ */}
        <div />
        {renderFaceGrid('D')}
        <div />
        <div />
      </div>
    </div>
  );
};
