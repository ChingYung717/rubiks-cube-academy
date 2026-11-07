import {
  Cubie,
  applyAlgorithm,
  createSolvedCube,
  getCubieAt,
  getMoveDefinition,
  invertAlgorithm,
  invertMove,
  isCubeSolved,
  parseAlgorithm,
} from '../engine/cubeEngine';

export type StageId = 'basics' | 'lbl' | 'cfop';

export interface Lesson {
  id: string;
  stageId: StageId;
  stageName: string;
  badge: string;
  title: string;
  subtitle: string;
  difficulty: '入门' | '基础' | '进阶' | '高阶';
  formula: string;
  exampleEndSetup?: string;
  mnemonic: string;
  summary: string;
  holdingTip: string;
  keyPoints: string[];
  introCommentary: string;
  stepCommentaries: string[];
  completionCommentary: string;
  focusLabel: string;
  isCubieFocused: (cubie: Cubie) => boolean;
  checkGoal: (cube: Cubie[]) => boolean;
}

export interface StageGroup {
  id: StageId;
  title: string;
  subtitle: string;
  badgeColor: string;
  lessons: Lesson[];
}

export interface ActiveCommentaryInfo {
  phase:
    | 'intro'
    | 'step'
    | 'practice-guide'
    | 'practice-half'
    | 'practice-error'
    | 'completed'
    | 'sandbox';
  badgeText: string;
  headline: string;
  detail: string;
  speechText: string;
  stepIndex: number | null;
}

function isCubieAtHomeSolved(cubie: Cubie): boolean {
  return (
    cubie.pos[0] === cubie.homePos[0] &&
    cubie.pos[1] === cubie.homePos[1] &&
    cubie.pos[2] === cubie.homePos[2] &&
    (cubie.homePos[1] !== 1 || cubie.faces.U === 'Y') &&
    (cubie.homePos[1] !== -1 || cubie.faces.D === 'W') &&
    (cubie.homePos[0] !== 1 || cubie.faces.R === 'R') &&
    (cubie.homePos[0] !== -1 || cubie.faces.L === 'O') &&
    (cubie.homePos[2] !== 1 || cubie.faces.F === 'B') &&
    (cubie.homePos[2] !== -1 || cubie.faces.B === 'G')
  );
}

function isWhiteCrossSolved(cube: Cubie[]): boolean {
  return cube
    .filter((c) => c.type === 'edge' && c.homePos[1] === -1)
    .every(isCubieAtHomeSolved);
}

function isFirstLayerSolved(cube: Cubie[]): boolean {
  return cube
    .filter((c) => c.homePos[1] === -1)
    .every(isCubieAtHomeSolved);
}

function isF2LSolved(cube: Cubie[]): boolean {
  return cube
    .filter((c) => c.homePos[1] === -1 || c.homePos[1] === 0)
    .every(isCubieAtHomeSolved);
}

function isTopYellowCrossOriented(cube: Cubie[]): boolean {
  if (!isF2LSolved(cube)) return false;
  const topEdges = cube.filter((c) => c.type === 'edge' && c.pos[1] === 1);
  return topEdges.length === 4 && topEdges.every((c) => c.faces.U === 'Y');
}

function isTopFullYellowOriented(cube: Cubie[]): boolean {
  if (!isF2LSolved(cube)) return false;
  const topCubies = cube.filter((c) => c.pos[1] === 1);
  return topCubies.length === 9 && topCubies.every((c) => c.faces.U === 'Y');
}

export const LESSONS: Lesson[] = [
  // ==================== STAGE 1: 零基础认知与记号 ====================
  {
    id: 'basics-structure',
    stageId: 'basics',
    stageName: '阶段一 · 零基础认知与记号',
    badge: '认知 1/3',
    title: '认识三阶魔方结构：中心块 · 棱块 · 角块',
    subtitle: '理解 6 个固定中心、12 个双色棱块与 8 个三色角块的运动规律',
    difficulty: '入门',
    formula: "R U F F' U' R'",
    mnemonic: '中心定面色，棱块两面走，角块三面游',
    summary:
      '三阶魔方并不是 54 个独立贴纸，而是由 26 个刚性小块组成：6 个单色【中心块】固定在轴心决定每面最终颜色（标准持法：上黄 U、下白 D、前蓝 F、后绿 B、左橙 L、右红 R）；12 个双色【棱块】永远只在棱位移动；8 个三色【角块】永远只在角位移动。',
    holdingTip: '标准持握：黄色中心朝上 (U)，白色中心朝下 (D)，蓝色中心正对自己 (F)。',
    keyPoints: [
      '【中心块 (6个)】：只有 1 种颜色，相对位置永远不变（黄白相对、蓝绿相对、红橙相对）。',
      '【棱块 (12个)】：夹在两个角块之间，拥有 2 种颜色（如白蓝棱块、蓝红棱块）。',
      '【角块 (8个)】：位于魔方八个顶点，拥有 3 种颜色（如白蓝红角块）。',
    ],
    introCommentary:
      '从六面还原状态开始。请保持上黄、下白、前蓝。转动外层时，中心块留在各自面的中央，棱块只在棱位移动，角块只在角位移动。',
    stepCommentaries: [
      '第 1 步 R（右层顺时针上推 90°）：观察右侧红色中心块原地自转，而右前方的双色棱块和三色角块随右层一起向上移动。',
      '第 2 步 U（顶层顺时针左拨 90°）：右手食指将顶层向左拨动，黄色中心块位置不变，周围四个棱块与角块在顶层水平轮换。',
      '第 3 步 F（前层顺时针右压 90°）：正对蓝色前面顺时针压动 90°，可以看到棱块永远只在棱位移动，角块永远只在顶点角位移动。',
      "第 4 步 F'（前层逆时针转 90°）：先撤销刚才的 F，魔方回到第 2 步转完 U 时的状态。",
      "第 5 步 U'（顶层逆时针右拨 90°）：撤销第 2 步的 U，现在只剩第一步的 R 尚未撤销。",
      "第 6 步 R'（右层逆时针下拉 90°）：右手将右层向下拉回 90°，所有棱块与角块严丝合缝回到初始六面还原状态！",
    ],
    completionCommentary:
      '太棒了！你已经看清了三阶魔方的骨骼奥秘：6 个中心块定基准、12 个双色棱块走边棱、8 个三色角块走顶点，三者绝不会互相串位。',
    focusLabel: '聚焦前右上区域（黄/蓝/红中心块 + 相邻棱块与角块）',
    isCubieFocused: (c) =>
      c.type === 'center' ||
      (c.homePos[0] >= 0 && c.homePos[1] >= 0 && c.homePos[2] >= 0),
    checkGoal: (cube) => isCubeSolved(cube),
  },
  {
    id: 'basics-notation',
    stageId: 'basics',
    stageName: '阶段一 · 零基础认知与记号',
    badge: '认知 2/3',
    title: '国际标准转动记号：R · U · F · L · D · B',
    subtitle: '掌握六面字母、撇号逆时针 (\') 与 180° 双转 (2) 的通用语言',
    difficulty: '入门',
    formula: 'R U F L D B',
    mnemonic: '正视该面顺时针为字母，加撇 (\') 逆时针，加 2 转半圈',
    summary:
      '国际魔方公式由六个英文字母代表六个外层：R (Right 右)、L (Left 左)、U (Up 顶)、D (Down 底)、F (Front 前)、B (Back 后)。单独字母表示正对该面【顺时针转 90°】，带撇号如 R\' 表示【逆时针转 90°】，带数字 2 如 U2 表示【转 180°】。',
    holdingTip: '跟着 3D 箭头依次体验 R → U → F → L → D → B 六个面的顺时针拨动方向。',
    keyPoints: [
      'R 与 U 是最常用的高频动作：R 为右手向上推右层，U 为右手食指向左拨顶层。',
      '注意 L 与 R 方向相反：正对左面顺时针看，L 是将左层向前下方拉动。',
      '注意 B (后层)：正对背面看，B 是顺时针转 90°；从正面看，后层顶排向左移动。',
    ],
    introCommentary:
      '本课带你掌握国际通用魔方记号 WCA Notation。我们将依次顺时针拨动右、顶、前、左、底、后六个面，每一步都请结合 3D 提示箭头体会“正视该面顺时针”的含义。',
    stepCommentaries: [
      '第 1 步 R（Right 右层顺时针）：正对右侧红面看，顺时针就是右手握住右层向上推 90°。',
      '第 2 步 U（Up 顶层顺时针）：俯视顶面黄面看，顺时针就是右手食指从右前方向左拨动顶层 90°。',
      '第 3 步 F（Front 前层顺时针）：正对正面蓝面看，顺时针就是右手食指将前层向右下方压动 90°。',
      '第 4 步 L（Left 左层顺时针）：注意易错点！正对左侧橙面看顺时针，左手是将左层向前下方拉动 90°，与 R 的方向恰好相反。',
      '第 5 步 D（Down 底层顺时针）：从魔方底部向上仰视白面，顺时针是将底层从左向右拨动 90°，与 U 的方向相反。',
      '第 6 步 B（Back 后层顺时针）：正对背面绿面顺时针转 90°。从正面看，后层顶排向左移动，六面顺时针体验圆满完成！',
    ],
    completionCommentary:
      '恭喜掌握六面国际符号！请牢记：单字母代表正对该面顺时针转 90°，加撇号代表逆时针转 90°，加数字 2 代表转 180° 半圈。',
    focusLabel: '聚焦全魔方六个中心块与前右顶特征块',
    isCubieFocused: () => true,
    checkGoal: (cube) => isCubeSolved(cube),
  },
  {
    id: 'basics-sexy-move',
    stageId: 'basics',
    stageName: '阶段一 · 零基础认知与记号',
    badge: '认知 3/3',
    title: '黄金基本功：右手“上左下右” (R U R\' U\')',
    subtitle: '贯穿层先法与 CFOP 速拧的核心四步触发器 (Sexy Move)',
    difficulty: '入门',
    formula: "R U R' U'",
    mnemonic: '右手上(R) · 食指左(U) · 右手下(R\') · 左手右(U\')',
    summary:
      '“上左下右” (R U R\' U\') 是魔方还原中最核心的肌肉记忆手法。在入门层先法中，它可以完成底层白角归位、顶层黄十字、甚至改写顶层角块；在任何还原状态下连续做 6 次“上左下右”，魔方还会神奇地回到原状！',
    holdingTip: '蓝色朝前、黄色朝上，观察右前顶 (UFR) 的白蓝红角块如何被“上左下右”精准送入右前底槽位！',
    keyPoints: [
      '第 1 步 R（上）：右手拇指在下、其余三指在上，将右层向上推 90°。',
      '第 2 步 U（左）：右手食指勾住右前顶角块，向左轻拨顶层 90°。',
      '第 3 步 R\'（下）：右手手腕回正，将右层向下拉回 90°。',
      '第 4 步 U\'（右）：左手食指从左前向右推回顶层 90°，一气呵成！',
    ],
    introCommentary:
      '这是魔方界最著名的黄金基本功——右手“上左下右”（R U R\' U\'）。请重点盯着右前顶那颗高亮的【白-蓝-红角块】，看四步手法如何把它精准送入右前底槽位！',
    stepCommentaries: [
      '第 1 步 R（上）：右手向上推右层 90°，将右前底槽位向上打开，白蓝红角块随之移至右后顶。',
      '第 2 步 U（左）：右手食指顺势向左拨动顶层 90°，把白蓝红角块拨回右前顶正上方。',
      "第 3 步 R'（下）：右手手腕回正，将右层向下拉回 90°，白蓝红角块已经稳稳落入右前底槽位！",
      "第 4 步 U'（右）：左手食指向右推回顶层 90° 收尾，完成一整套丝滑的“上左下右”触发器！",
    ],
    completionCommentary:
      '漂亮！“上左下右”四步一气呵成，白蓝红角块白色朝下、蓝红侧面与中心块完美对齐。这套手法将贯穿后面的层先法与 CFOP！',
    focusLabel: '仅高亮【白蓝红角块】与底/前/右中心块，屏除其他干扰色块',
    isCubieFocused: (c) =>
      c.type === 'center' ||
      (c.homePos[0] === 1 && c.homePos[1] === -1 && c.homePos[2] === 1),
    checkGoal: (cube) => isFirstLayerSolved(cube),
  },

  // ==================== STAGE 2: 入门层先法 (LBL 7步还原) ====================
  {
    id: 'lbl-step1-cross',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 1 步',
    title: '底层白十字 (White Cross)：对齐侧面中心块',
    subtitle: '不仅要在底面拼出白色十字，四个白棱侧面颜色还必须与中心块同色',
    difficulty: '基础',
    formula: "U' R' F R",
    exampleEndSetup: "U R U' R'",
    mnemonic: '先看小花后对齐，侧面不合巧借邻层入底槽',
    summary:
      '层先法第一步是在底面 (D) 拼出正确的【白色十字】。很多新手拼出白十字后忽略了侧面：每个白棱块的侧面颜色（蓝、红、绿、橙）必须与四个侧面中心块一一对应！当遇到白蓝棱块白色朝前（翻转状态）时，使用 U\' R\' F R 即可在不破坏已有十字的前提下将其归位。',
    holdingTip: '白色中心朝下，蓝色中心朝前。观察顶层带有白蓝双色的目标棱块。',
    keyPoints: [
      '检验标准：底面呈现白色十字，且前(蓝)、右(红)、后(绿)、左(橙)四个侧面的中心块与底棱颜色完全一致。',
      '若白棱块在顶层且白色朝上：直接转 U 对齐侧面中心块色，再转 F2（180°）即可一步落底。',
      '若白棱块在顶层但白色朝外（翻色）：做 U\' R\' F R 借用右层顺势送入前底槽，最后 R 恢复右层十字。',
    ],
    introCommentary:
      '层先法第 1 步是拼好底层白色十字，且四个白棱侧面颜色必须与中心块对齐。目前底面还缺前方的【白蓝棱块】，它停在顶层但白色朝外翻色了，我们用四步巧借右层将它归位。',
    stepCommentaries: [
      "第 1 步 U'（顶层右拨）：先把顶层的白蓝棱块向右拨到右侧红面上方，准备借用右层通道。",
      "第 2 步 R'（右层下拉）：将右层向下拉动 90°，把白蓝棱块带到前右中层位置，此时蓝色贴纸正好对准蓝色中心块！",
      '第 3 步 F（前层顺转）：顺时针转动前层 90°，将对齐好蓝色的白蓝棱块直接送入前底（DF）十字槽位。',
      '第 4 步 R（右层上推恢复）：别忘了刚才借用了右层！将右层向上推回 90°，把右底的白红棱块恢复原位。',
    ],
    completionCommentary:
      '底层白十字大功告成！你可以仰视底面检查：四个白色棱块拼成十字，同时前蓝、右红、后绿、左橙四个侧面与中心块完全同色。',
    focusLabel: '聚焦 6 个中心块 + 4 个底层白色棱块（暗化所有角块与中顶层棱块）',
    isCubieFocused: (c) =>
      c.type === 'center' || (c.type === 'edge' && c.homePos[1] === -1),
    checkGoal: (cube) => isWhiteCrossSolved(cube),
  },
  {
    id: 'lbl-step2-corners',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 2 步',
    title: '底层四白角归位：完成完整第一层',
    subtitle: '将白角移至目标槽位正上方，用“上左下右”送入底层',
    difficulty: '基础',
    formula: "U R U' R'",
    exampleEndSetup: "U R U' R' U' F' U F",
    mnemonic: '白角先找两中心，停在右前顶，白朝前做“左上右下”或重复“上左下右”',
    summary:
      '完成底层白十字后，第二步是还原底层 4 个白色角块。先在顶层找到带白色的角块（如白-蓝-红角块），转动顶层 U 把它移到蓝色中心和红色中心夹角的正上方（右前顶 UFR 位置），然后执行 U R U\' R\'（或重复 R U R\' U\'）即可把角块稳稳放入右前底槽位！',
    holdingTip: '保持白十字在下，将目标槽位放在【右前底 (DFR)】位置进行操作。',
    keyPoints: [
      '切勿只看底面白色：白角块归位后，它的另外两个侧面颜色必须与相邻的两个中心块颜色完全吻合（T字形）。',
      '三种朝向速解：① 白色朝右：直接做 1 次 R U R\' U\'；② 白色朝前（本课演示）：做 U R U\' R\'；③ 白色朝上：连续做 3 次 R U R\' U\'。',
      '若白色角块卡在底层错误槽位：先做一次 R U R\' U\' 把它顶到顶层，再按正常步骤归位。',
    ],
    introCommentary:
      '层先法第 2 步还原底层四个白色角块。观察右前顶（UFR）的【白-蓝-红角块】，它的白色贴纸朝向正面（蓝色面）。此时只需执行四步“左上右下”（U R U\' R\'）即可入槽。',
    stepCommentaries: [
      '第 1 步 U（顶层左拨避让）：先将白蓝红角块向左拨到左前顶，把右侧空间让出来。',
      '第 2 步 R（右层上推开槽）：右手将右层向上推起 90°，把右前底的目标空槽提到顶层来迎接角块。',
      "第 3 步 U'（顶层右拨入位）：左手食指将顶层向右推回 90°，白蓝红角块正好嵌入刚打开的右槽并与白红底棱对齐。",
      "第 4 步 R'（右层下拉关槽）：右手将右层向下拉回 90°，角块随右层一起落入右前底！",
    ],
    completionCommentary:
      '完整第一层还原成功！现在不仅底面 9 个贴纸全白，而且底层的蓝、红、绿、橙四条边都形成了整齐的小 T 字。',
    focusLabel: '聚焦完整第一层（底层白十字 + 4 个白色角块）与侧面中心块',
    isCubieFocused: (c) => c.type === 'center' || c.homePos[1] === -1,
    checkGoal: (cube) => isFirstLayerSolved(cube),
  },
  {
    id: 'lbl-step3-middle-edges',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 3 步',
    title: '中层四棱块归位：经典“远切回回”公式',
    subtitle: '不破坏第一层的前提下，将顶层无黄棱块送入中层槽位',
    difficulty: '基础',
    formula: "U R U' R' U' F' U F",
    exampleEndSetup: "F R U R' U' F'",
    mnemonic: '侧面连成小T字 → 顶层远离目标槽 → 目标手做上左下右 → 换手接回白角',
    summary:
      '第三步还原中间层 4 个不含黄色的棱块（蓝红、红绿、绿橙、橙蓝）。在顶层找到不含黄色的【蓝红棱块】，将它的正面颜色（蓝）与蓝色中心块对齐形成竖线，由于它要去右边的【前右槽位】，执行右手版“远切回回”：U R U\' R\' U\' F\' U F 即可与白角配对并一起落入槽中！',
    holdingTip: '蓝色中心朝前，红色中心朝右，观察前顶 (UF) 的蓝红棱块如何进入前右 (FR) 中层槽。',
    keyPoints: [
      '前半段 (U R U\' R\')：先转 U 让棱块【远离】右侧目标槽，再做右手“上左下右”，此时底角与中棱已在顶层配成一对！',
      '后半段 (U\' F\' U F)：换左手/前层视野，将刚才被提出来的白蓝红角块连同蓝红棱块一起接回前右槽。',
      '镜像规律：如果棱块需要去【左前槽】，则反向做左手版 U\' L\' U L U F U\' F\'。',
    ],
    introCommentary:
      '层先法第 3 步还原中间层四个不含黄色的棱块。观察前顶（UF）的【蓝红棱块】，正面蓝色已与蓝色中心块连成小 T 字，它要去右边的【前右槽】，我们执行 8 步右手版“远切回回”。',
    stepCommentaries: [
      '第 1 步 U（远离目标槽）：蓝红棱块要去右边，所以先转 U 让它向【左边】远离目标槽位。',
      '第 2 步 R（目标手上推）：右手将目标槽所在的右层向上推 90°，把右前底的白蓝红角块提上来。',
      "第 3 步 U'（顶层回拨）：顶层向右拨回 90°，此时白蓝红角块与蓝红棱块在顶层悄然配成了一对！",
      "第 4 步 R'（右层下拉）：右手将右层拉回 90°，前半段“上左下右”完成，配好对的角块与棱块正停在顶层前排。",
      "第 5 步 U'（继续右拨准备接回）：将配好对的角棱组合向右拨，为前层开门腾出空间。",
      "第 6 步 F'（前层逆转开门）：将蓝色前层逆时针挑起 90°，打开前右槽的正面入口。",
      '第 7 步 U（顶层左拨装入）：将配好对的白蓝红角块与蓝红棱块一起向左拨入前层槽口。',
      '第 8 步 F（前层顺转关门）：顺时针压回前层 90°，白角与蓝红中棱同时归位，第一层丝毫无损！',
    ],
    completionCommentary:
      '太精彩了！通过“远切回回”8 步公式，蓝红棱块已稳稳嵌入中层，整个魔方的前两层（F2L）现已全部拼好！',
    focusLabel: '聚焦前两层 (F2L)，暗化顶层黄色块，清晰观察蓝红中棱的配对入槽轨迹',
    isCubieFocused: (c) => c.homePos[1] <= 0,
    checkGoal: (cube) => isF2LSolved(cube),
  },
  {
    id: 'lbl-step4-yellow-cross',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 4 步',
    title: '顶层黄十字：六步顺转公式 (F R U R\' U\' F\')',
    subtitle: '从“单点 → 小拐角 → 一字横线 → 顶面黄十字”的递进翻色',
    difficulty: '基础',
    formula: "F R U R' U' F'",
    exampleEndSetup: "R U R' U R U2 R'",
    mnemonic: '前层顺转起手(F) → 右手上左下右(R U R\' U\') → 前层逆转收尾(F\')',
    summary:
      '前两层完成后，第四步只看顶面黄色棱块，目标是拼出【顶面黄色十字】（此时暂不要求侧面颜色对齐）。顶面只会出现 4 种图案：中心单点、小拐角、一字线、黄十字。只需记住一个 6 步公式 F (R U R\' U\') F\'，按正确摆放角度执行 1~3 次即可拼出黄十字！',
    holdingTip: '横线放在左、右两侧。本站的拐角示例从右、前两个黄棱开始，做一次公式得到竖线，再转 U 摆成横线。',
    keyPoints: [
      '公式拆解极易记忆：把前层顺时针压下 (F) → 做一次熟悉的“上左下右” (R U R\' U\') → 把前层提回原位 (F\')！',
      '状态演进：单点 → 右前拐角 → 竖线。得到竖线后先转 U 摆成横线，再做一次公式。',
      '本课可以切换单点、拐角和横线三个起手盘面，每个示例都可以播放或跟练。',
    ],
    introCommentary:
      '层先法第 4 步是在顶面拼出【黄色十字】。当前顶面黄色呈一条水平“一字横线”（左-中-右），请保持横线水平摆放，执行 6 步公式 F (R U R\' U\') F\'。',
    stepCommentaries: [
      '第 1 步 F（前层顺时针压下）：先将蓝色前层顺时针压下 90°，进入顶层棱块翻色准备态。',
      '第 2 步 R（上）：紧接着做一遍最熟悉的右手“上左下右”——第 1 动，右层上推。',
      '第 3 步 U（左）：“上左下右”第 2 动，右手食指将顶层向左拨 90°。',
      "第 4 步 R'（下）：“上左下右”第 3 动，右层向下拉回 90°，恢复右侧前两层。",
      "第 5 步 U'（右）：“上左下右”第 4 动，左手食指将顶层向右拨回 90°。",
      "第 6 步 F'（前层逆时针提回）：最后将前层逆时针挑回 90°，前两层恢复原状，顶面四个黄棱全部翻正！",
    ],
    completionCommentary:
      '顶层黄色十字成形！只检查四个黄棱是否朝上，黄角和侧面的颜色留到后续步骤。',
    focusLabel: '高亮顶层黄色中心与 4 个顶层棱块，辅助观察黄十字成形过程',
    isCubieFocused: (c) =>
      c.type === 'center' || (c.type === 'edge' && c.homePos[1] === 1) || c.homePos[1] <= 0,
    checkGoal: (cube) => isTopYellowCrossOriented(cube),
  },
  {
    id: 'lbl-step5-sune',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 5 步',
    title: '顶面黄色全满：经典“小鱼公式” (Sune)',
    subtitle: '鱼头朝左前，七步让整个顶面全部变成黄色',
    difficulty: '基础',
    formula: "R U R' U R U2 R'",
    exampleEndSetup: "R U R' U' R' F R2 U' R' U' R U R' F'",
    mnemonic: '鱼头朝左前 · 上左下左上左左(180°)下',
    summary:
      '拼出顶层黄十字后，第五步要把顶层 4 个角块的黄色也全部翻到顶面（OLL 简化版）。最经典的核心形态像一条小鱼（1 个角块黄色朝上作为“鱼头”，3 个角块黄色在侧面）。把【鱼头放在左前角 (UFL)】，若右前角正面有黄色，执行右手小鱼公式 R U R\' U R U2 R\' 即可一次翻满整个顶面黄色！',
    holdingTip: '将顶面唯一的黄色角块（鱼头）放在【左前角 (UFL)】，观察右前角正面的黄色贴纸。',
    keyPoints: [
      '节奏口诀：“上(R) 左(U) 下(R\') 左(U) · 上(R) 左左(U2) 下(R\')”，全程只动 R 和 U 两层，顺滑无比！',
      '如果不是小鱼怎么办？① 没有角块朝上（十字）：把左前角侧面黄朝左做一次小鱼；② 两个角块朝上（双鱼/坦克）：把左前角前面放黄色做一次小鱼，都会自动转化为标准小鱼！',
    ],
    introCommentary:
      '层先法第 5 步要让顶面 9 个块全部变成黄色！当前顶面像一条“小鱼”：唯一朝上的黄色角块在【左前角（鱼头）】。认准鱼头朝左前，执行 7 步经典小鱼公式（Sune）！',
    stepCommentaries: [
      '第 1 步 R（上）：右手向上推右层 90°，将右前底的白角块暂时提起作为旋转支点。',
      '第 2 步 U（左）：右手食指向左拨顶层 90°，把提上来的白角块向左后方推移。',
      "第 3 步 R'（下）：右手向下拉回右层 90°，先关上右侧槽位。",
      '第 4 步 U（再左）：注意这里是继续向左拨 U（不是 U\'）！把白角块推到左后顶角位置。',
      '第 5 步 R（上）：再次向上推起右层 90°，准备用 180° 大跨步接回白角块。',
      '第 6 步 U2（左左 180°）：右手食指与中指连续向左拨动顶层两次（180°），白角块跨越半圈回到右槽口！',
      "第 7 步 R'（下）：右手将右层向下拉回 90°，底角归位的同时，顶面三枚角块全部翻成黄色！",
    ],
    completionCommentary:
      '鱼跃龙门，顶面全黄达成！“上左下左上左左下”全程只转 R 和 U 两层，是魔方速拧中最顺手的核心公式之一。',
    focusLabel: '聚焦顶层 9 个黄面块，清晰展示小鱼头与三枚翻色角块的旋转轨迹',
    isCubieFocused: (c) => c.homePos[1] === 1 || c.type === 'center',
    checkGoal: (cube) => isTopFullYellowOriented(cube),
  },
  {
    id: 'lbl-step6-corners-perm',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 6 步',
    title: '顶层四角归位：寻找“车灯”角块轮换',
    subtitle: '观察背面的同色角块，再用三角轮换对齐四个顶角',
    difficulty: '进阶',
    formula: "R' F R' B2 R F' R' B2 R2",
    exampleEndSetup: "R U' R U R U R U' R' U' R2",
    mnemonic: '同色车灯放背面 (B)，下前下后后 · 上前下后后 · 右层转半圈',
    summary:
      '顶面全黄后，第六步还原顶层 4 个角块的位置。观察顶层四个侧面，寻找是否存在两个角块颜色相同的一侧（俗称“车灯”或“眼睛”）。将这组【车灯转到背面 (B面)】，然后执行角块三轮换公式 R\' F R\' B2 R F\' R\' B2 R2，顶层四个角块即可归位（若一次后仍为三轮换，保持车灯在背面再做一次，最后转 U 对齐四面车灯）！',
    holdingTip: '先找顶层侧面的一对同色角块。本例的红色车灯已经在背面，先保持当前朝向。',
    keyPoints: [
      '本例背面有一对红色车灯，执行一次公式后四个顶角直接对齐中心。实战中若方向相反可再做一次，并用 U/U\'/U2 对齐（AUF）。',
      '如果四面都没有车灯（斜角交换状态）：任意方向先做一次本公式，魔方上就一定会出现一组车灯！',
      '公式结构对称：B2 出现两次，结尾是 R2，熟练后只需 2 秒即可完成。',
    ],
    introCommentary:
      '层先法第 6 步调整顶层四个角块的位置。先观察背面（绿色 B 面）：顶排两个角块的背面贴纸都是红色，像一对“汽车尾灯”。把这对同色车灯朝向背面放好，执行 9 步角块三轮换公式！',
    stepCommentaries: [
      "第 1 步 R'（下）：右手将右层向下拉 90°，起手准备交换前排角块。",
      '第 2 步 F（前顺）：将前面顺时针压下 90°，拆分前排待交换角块。',
      "第 3 步 R'（下）：再次将右层向下拉 90°，把角块送往背面轨道。",
      '第 4 步 B2（后层半圈 180°）：第一次转后层 180°，利用背面作为角块缓存区进行交换。',
      '第 5 步 R（上）：右手将右层向上推回 90°。',
      "第 6 步 F'（前逆）：将前面逆时针挑回 90°，恢复前层结构。",
      "第 7 步 R'（下）：右手将右层向下拉 90°，准备接回背面缓存的角块。",
      '第 8 步 B2（后层半圈 180°）：第二次转后层 180°，将背面两组块彻底还原对齐。',
      '第 9 步 R2（右层半圈 180°）：最后将右层转 180° 收尾，顶层四角全部归位！',
    ],
    completionCommentary:
      '四角归位完成！现在观察顶层四个侧面，蓝、红、绿、橙每一面的左右两个顶角颜色都已与中心块一致，全都亮起了“车灯”！',
    focusLabel: '聚焦顶层 4 个角块与四面中心块，突出观察“车灯”对齐效果',
    isCubieFocused: (c) =>
      c.type === 'center' || (c.type === 'corner' && c.homePos[1] === 1),
    checkGoal: (cube) =>
      isTopFullYellowOriented(cube) &&
      cube.filter((c) => c.type === 'corner' && c.homePos[1] === 1).every(isCubieAtHomeSolved),
  },
  {
    id: 'lbl-step7-edges-perm',
    stageId: 'lbl',
    stageName: '阶段二 · 入门层先法 (7步还原)',
    badge: '第 7 步 · 收官',
    title: '顶层四棱归位：三棱换完成六面还原！',
    subtitle: '拼好的一面放背面，用三棱逆时针/顺时针轮换见证六面复原奇迹',
    difficulty: '进阶',
    formula: "R U' R U R U R U' R' U' R2",
    mnemonic: '拼好一面放背面 (B)，全程只转 R 与 U，三棱归位六面成！',
    summary:
      '恭喜来到层先法最后一步！此时四个顶角已全部对齐，只需将最后 3 个或 4 个顶层棱块平移归位。将【已经完全拼好的那个侧面放在背面 (B面)】，若前、左、右三个棱块需要【逆时针轮换 (Ua Perm)】，执行 R U\' R U R U R U\' R\' U\' R2 即可一步完成整颗三阶魔方的六面还原！',
    holdingTip: '将已经完全拼好的一整面（本课为绿色面）朝向【背面 (B)】，蓝色面朝前。',
    keyPoints: [
      '全程仅使用 R 和 U 两个面，完全不需要翻转魔方，极其顺手且同样是 CFOP 中的必背 Ua 公式！',
      '如果三个棱块需要顺时针轮换：连续做 2 次本公式（或直接用右手小鱼 + 左手小鱼组合）即可完成还原。',
      '如果四面都没有拼好（四棱对换）：任意方向先做一次本公式，就会拼好一面，再将其放到背面做一次即大功告成！',
    ],
    introCommentary:
      '欢迎来到层先法收官第 7 步！目前背面（绿色面）已经完全拼好，只剩前、左、右三个顶层棱块需要逆时针轮换。保持拼好的绿色面朝向背面，全程只需转 R 和 U 即可见证六面复原！',
    stepCommentaries: [
      '第 1 步 R（上）：右手向上推右层 90°，启动三棱换（Ua Perm）第一拍。',
      "第 2 步 U'（右）：左手食指将顶层向右拨 90°。",
      '第 3 步 R（上）：右手继续向上推右层 90°，此时右层已累计转过半圈。',
      '第 4 步 U（左）：右手食指将顶层向左拨 90°，进入中段交替节奏。',
      '第 5 步 R（上）：右手向上推右层 90°。',
      '第 6 步 U（左）：右手食指继续将顶层向左拨 90°。',
      '第 7 步 R（上）：右手向上推右层 90°，完成前中段四个 R 的循环推进。',
      "第 8 步 U'（右）：左手食指将顶层向右拨回 90°，开始收尾对位。",
      "第 9 步 R'（下）：右手将右层向下拉回 90°。",
      "第 10 步 U'（右）：左手食指将顶层向右拨回 90°，顶层所有颜色已全部对齐！",
      '第 11 步 R2（右层 180° 收官）：右手将右层旋转 180° 半圈，整颗三阶魔方六面完美复原！',
    ],
    completionCommentary:
      '🎉 恭喜你完整掌握了三阶魔方入门层先法（LBL）全部 7 步！现在任何打乱的三阶魔方，你都可以独立一步步将它六面还原了！',
    focusLabel: '聚焦顶层 4 个棱块与各面中心，见证最后三棱归位、六面圆满还原',
    isCubieFocused: (c) => c.homePos[1] === 1 || c.type === 'center',
    checkGoal: (cube) => isCubeSolved(cube),
  },

  // ==================== STAGE 3: 进阶 CFOP 速拧核心 ====================
  {
    id: 'cfop-cross-advanced',
    stageId: 'cfop',
    stageName: '阶段三 · CFOP 速拧进阶核心',
    badge: 'CFOP · Cross',
    title: '[C - Cross] 速拧底层十字：盲拧级 5 步连入',
    subtitle: '告别新手顶面小花，利用底面相对位置 (蓝-红-绿-橙) 直接在 D 层联动建十字',
    difficulty: '进阶',
    formula: "D' R' F D2 L2",
    exampleEndSetup: "U R U' R'",
    mnemonic: '底白死锁不翻面，先借 D 层凑相对，最后 D2 齐归位',
    summary:
      'CFOP 的第一阶段【Cross】要求全程保持白色朝下 (D)，省去新手“先拼顶面小花再翻面”的时间损耗。高手在 15 秒观察期内，利用侧面中心块【前蓝-右红-后绿-左橙】的固定顺时针关系，先将白棱块按相对顺序放入底面，最后用一步 D 或 D2 让四个白棱瞬间同时对齐中心块！',
    holdingTip: '全程黄色朝上、白色朝下，观察四个白棱块如何通过 D 层错位联动在 5 步内一次性归位。',
    keyPoints: [
      '相对位置铁律：即使不对齐中心块，只要底面满足【蓝在红左、红在绿左、绿在橙左】，最后转一下 D 层就能四个一起对齐！',
      '联动插入技巧：先用 D\' 让底面已有的白蓝、白红棱腾出前底槽位，再通过 R\' F 将顶层的白绿棱顺势送入前底槽。',
      '世界级标准：任何打乱状态下的底层十字都可以在 8 步以内（通常 5~6 步）全部完成。',
    ],
    introCommentary:
      '进入阶段三 CFOP 速拧进阶！高手做底层十字（Cross）绝不翻面拼小花，而是全程保持白色朝下，利用【前蓝-右红-后绿-左橙】的相对位置关系，借用 D 层错位在 5 步内一气呵成！',
    stepCommentaries: [
      "第 1 步 D'（底层左拨错位）：先将底层向左拨 90°，把底面已有的白蓝棱移到后底、白红棱移到左底，为右前方的白绿棱腾出前底相对槽位。",
      "第 2 步 R'（右层下拉递送）：右层下拉 90°，将右顶（UR）的白绿棱块顺势带到右前棱位（FR）！",
      '第 3 步 F（前层顺压入底）：顺势压动前层 90°，白绿棱块落入前底槽（DF），与左底的白红棱、后底的白蓝棱形成正确的相对顺序。',
      '第 4 步 D2（底层旋转 180° 对齐）：底层转半圈 180°，让底面已有的白蓝、白红、白绿三个底棱瞬间同时对齐各自的侧面中心块！',
      '第 5 步 L2（左层 180° 落底收官）：最后左层转 180°，将顶层蓄势待发的白橙棱块一步送入左底，五步盲拧级十字完成！',
    ],
    completionCommentary:
      '干净利落！仅用 5 步且全程无需翻转魔方就建好了标准底十字，这就是 CFOP 速拧选手在 1.5 秒内完成 Cross 的秘诀。',
    focusLabel: '极简十字视野：仅高亮 6 个中心块与 4 个白色底棱，屏蔽全部其余 16 个块',
    isCubieFocused: (c) =>
      c.type === 'center' || (c.type === 'edge' && c.homePos[1] === -1),
    checkGoal: (cube) => isWhiteCrossSolved(cube),
  },
  {
    id: 'cfop-f2l-case1',
    stageId: 'cfop',
    stageName: '阶段三 · CFOP 速拧进阶核心',
    badge: 'CFOP · F2L #1',
    title: '[F2L 标态一] 同色已配对：4 步入槽',
    subtitle: '识别顶层已经配好的角棱对，再将它送入右前槽',
    difficulty: '进阶',
    formula: "U R U' R'",
    exampleEndSetup: "R U R' U R U2 R'",
    mnemonic: '配好的一对先让开，开槽、拨回、关槽',
    summary:
      '白蓝红角在右前顶（UFR），白色朝前；蓝红棱在右顶（UR）。两块都蓝色朝上、红色朝右，已经配成一对。保持目标槽位在右前方，用 U R U\' R\' 把它们一起送下去。',
    holdingTip: '观察角、棱相邻的蓝色和红色贴纸，保持目标槽在右前方。',
    keyPoints: [
      '识别配对：朝上的蓝色和朝右的红色分别连成条，角、棱已经相连。',
      '先把配对移开再转 R，避免开槽时拆散这一对。',
    ],
    introCommentary:
      '这对角棱已经配好：角块在右前顶、棱块在右顶。先向左移开这一对，再打开右槽。',
    stepCommentaries: [
      '第 1 步 U：配对整体向左移动，角块到左前顶，棱块到前顶。',
      '第 2 步 R：打开右前槽，左侧的配对保持原状。',
      "第 3 步 U'：把整对角棱送回右前槽上方。",
      "第 4 步 R'：关闭右槽，将角棱一起放回正确位置。",
    ],
    completionCommentary:
      '右前角和中层棱已一起归位。找下一组角棱时，先检查它们是否已经配对。',
    focusLabel: 'F2L 专属显微镜：仅高亮【白十字 + 右前槽白蓝红角块 & 蓝红棱块】',
    isCubieFocused: (c) =>
      c.type === 'center' ||
      (c.type === 'edge' && c.homePos[1] === -1) ||
      (c.homePos[0] === 1 && c.homePos[2] === 1 && c.homePos[1] <= 0),
    checkGoal: (cube) => isF2LSolved(cube),
  },
  {
    id: 'cfop-f2l-case2',
    stageId: 'cfop',
    stageName: '阶段三 · CFOP 速拧进阶核心',
    badge: 'CFOP · F2L #2',
    title: '[F2L 标态二] 顶面异色：藏角移棱后入槽',
    subtitle: '先用右层暂存白角，调整角棱位置后再配对入槽',
    difficulty: '高阶',
    formula: "U' R U' R' U R U R'",
    exampleEndSetup: "R U R' U R U2 R'",
    mnemonic: '藏角、移棱、提角，再把配对送入右前槽',
    summary:
      '白蓝红角在右前顶，红色朝上、白色朝右；蓝红棱在右顶，蓝色朝上。两块虽然相邻，但朝上的颜色不同。先暂时把白角放到右后底，移动棱块，再把白角提回来并调整朝向。',
    holdingTip: '保持蓝色中心朝前、红色中心朝右，跟着右前方的白蓝红角和蓝红棱。',
    keyPoints: [
      '做完前四步，白角在右后顶，蓝红棱在左顶，两块仍然分开。',
      '第 7 步 U 才让两块在右前顶与右顶配成同色的一对。',
    ],
    introCommentary:
      '观察右前顶角的红色和右顶棱的蓝色，两块顶面异色。先藏角移棱，再配成一对。',
    stepCommentaries: [
      "第 1 步 U'：白角转到右后顶，蓝红棱转到后顶。",
      '第 2 步 R：把白角放到右后底，蓝红棱留在后顶。',
      "第 3 步 U'：白角留在底层，蓝红棱转到左顶。",
      "第 4 步 R'：把白角提回右后顶。",
      '第 5 步 U：白角回到右前顶，蓝红棱转到后顶。',
      '第 6 步 R：白角转到右后顶，蓝色朝上。',
      '第 7 步 U：角块和棱块相邻，蓝色朝上、红色朝右，配成一对。',
      "第 8 步 R'：把配好的角棱一起送进右前槽。",
    ],
    completionCommentary:
      '右前槽已还原。暂存角块的作用是让顶层可以单独移动棱块，最后再把它们配起来。',
    focusLabel: '聚焦【右前槽 F2L 配对组（白蓝红角 + 蓝红棱）】与底层十字',
    isCubieFocused: (c) =>
      c.type === 'center' ||
      (c.type === 'edge' && c.homePos[1] === -1) ||
      (c.homePos[0] === 1 && c.homePos[2] === 1 && c.homePos[1] <= 0),
    checkGoal: (cube) => isF2LSolved(cube),
  },
  {
    id: 'cfop-oll-21',
    stageId: 'cfop',
    stageName: '阶段三 · CFOP 速拧进阶核心',
    badge: 'CFOP · OLL #21',
    title: '[OLL #21] 双车灯十字秒翻 (Double Sune)',
    subtitle: '顶层四棱已黄、四角形成左右双车灯，一条RU流公式瞬间满黄',
    difficulty: '高阶',
    formula: "R U R' U R U' R' U R U2 R'",
    mnemonic: '车灯朝左右，做小鱼不收尾直接接第二条小鱼 (上左下左 · 上右下左 · 上左左下)',
    summary:
      'OLL (Orientation of Last Layer) 的目标是用 1 条公式直接将顶面全部翻成黄色。OLL #21（俗称“十字双车灯”或 H-OLL）是赛场上极高频的经典情况：顶面已有黄十字，且左、右两面各有一对黄色角块车灯。只需将两遍小鱼公式无缝衔接为 11 步 R-U 流：R U R\' U R U\' R\' U R U2 R\'，1 秒内即可一步满黄！',
    holdingTip: '将两组黄色角块“车灯”朝向【左面 (L) 与右面 (R)】。',
    keyPoints: [
      '记忆神技：普通小鱼是 R U R\' U R U2 R\'；双小鱼就是在第 5 步 R 之后把 U2 改成 (U\' R\' U R) 再接 U2 R\'！',
      '纯 RU 二元公式（2-Gen）：全程右手大拇指无需换握，食指左拨与无名指连拨配合极快。',
    ],
    introCommentary:
      '欢迎来到 OLL（顶层翻色）经典第 21 式——【十字双车灯】。顶面已有黄十字，且左面和右面各有一对黄色角块车灯。我们将两遍小鱼公式融合成一条 11 步纯 RU 流公式，一次翻满顶面！',
    stepCommentaries: [
      '第 1 步 R（上）：保持双车灯朝向左右，右手向上推右层 90° 起手第一条小鱼。',
      '第 2 步 U（左）：右手食指向左拨顶层 90°。',
      "第 3 步 R'（下）：右手向下拉回右层 90°。",
      '第 4 步 U（左）：右手食指继续向左拨顶层 90°。',
      '第 5 步 R（上）：右手向上推起右层 90°——注意！普通小鱼这里该转 U2 收尾，但双小鱼在这里直接衔接第二条小鱼！',
      "第 6 步 U'（右）：关键衔接点！左手食指向右拨顶层 90°，省去第一条小鱼收尾动作。",
      "第 7 步 R'（下）：右手向下拉回右层 90°。",
      '第 8 步 U（左）：右手食指向左拨顶层 90°，进入第二条小鱼后半段。',
      '第 9 步 R（上）：右手向上推起右层 90°。',
      '第 10 步 U2（左左 180°）：右手食指中指连拨顶层 180°，将白角块接回右槽口。',
      "第 11 步 R'（下）：右手拉回右层 90°，左右双车灯全部翻上顶面！",
    ],
    completionCommentary:
      '行云流水！11 步纯 R-U 公式全程无需换手，把两步 OLL 压缩成一步秒翻，这就是 CFOP 速拧的节奏美学！',
    focusLabel: '聚焦顶层 OLL 黄色贴纸与顶层 9 块，观察双车灯瞬间翻满顶面',
    isCubieFocused: (c) => c.homePos[1] === 1 || c.type === 'center',
    checkGoal: (cube) => isTopFullYellowOriented(cube),
  },
  {
    id: 'cfop-pll-tperm',
    stageId: 'cfop',
    stageName: '阶段三 · CFOP 速拧进阶核心',
    badge: 'CFOP · PLL T-Perm',
    title: '[PLL 之王 · T-Perm] 速拧必背 T 字邻角对棱换',
    subtitle: '全球魔方选手最喜爱的手感巅峰公式，交换右翼两角与左右两棱',
    difficulty: '高阶',
    formula: "R U R' U' R' F R2 U' R' U' R U R' F'",
    mnemonic: '上左下右 (R U R\' U\') → 下前上上 (R\' F R2) → 右下右下 (U\' R\' U\' R) → 左上左下前逆 (U R\' F\')',
    summary:
      'PLL (Permutation of Last Layer) 是 CFOP 的最后一步，在保持顶面黄色不变的前提下一次性还原顶层所有侧面位置。其中【T-Perm】因被交换的四个块（UFR↔UBR 两角互换 + UL↔UR 两棱互换）恰好构成字母 T 而得名。它由极为顺手的“上左下右”与 R-U-F 触发器组成，也是盲拧（BLD）的核心公式！',
    holdingTip: '将顶层左侧完整的【车灯】放在【左面 (L - 橙色面)】，待交换的两个角块位于右侧 (UFR 与 UBR)。',
    keyPoints: [
      '分段拆解记忆：① [R U R\' U\']（标准上左下右） ② [R\' F R2]（右下拉、前顺压、右转半圈） ③ [U\' R\' U\' R] ④ [U R\' F\']（收尾）。',
      '自逆特性：T-Perm 是一个“二阶对合变换”，在还原魔方上做一次 T-Perm 产生 T-Perm 残局，再做一次立即复原！',
    ],
    introCommentary:
      '这是全球魔方选手最喜爱的 PLL 之王——【T-Perm】！观察顶层：左面橙色车灯已对齐，需要交换右侧两个角块（UFR↔UBR）和左右两个棱块（UL↔UR），轨迹正好构成字母 T。把左侧车灯放左面，开始 14 步巅峰指法！',
    stepCommentaries: [
      '第 1 步 R（上）：第一小节是标准的“上左下右”——右手上推右层 90°。',
      '第 2 步 U（左）：右手食指向左拨顶层 90°。',
      "第 3 步 R'（下）：右手下拉右层 90°。",
      "第 4 步 U'（右）：左手食指向右拨回顶层 90°，完成第一小节 [R U R' U']。",
      "第 5 步 R'（下）：第二小节 [R' F R2] 启动——右手继续顺势将右层向下拉 90°。",
      '第 6 步 F（前顺）：右手食指顺时针下压前层 90°。',
      '第 7 步 R2（右层 180°）：右手手腕发力将右层连续上推 180° 半圈，完成中段核心块交换过渡！',
      "第 8 步 U'（右）：第三小节 [U' R' U' R]——左手食指向右拨顶层 90°。",
      "第 9 步 R'（下）：右手将右层向下拉 90°。",
      "第 10 步 U'（右）：左手食指再次向右拨顶层 90°。",
      '第 11 步 R（上）：右手将右层向上推 90°，将右侧角棱块重新归拢。',
      "第 12 步 U（左）：第四小节 [U R' F'] 收官——右手食指向左拨顶层 90°。",
      "第 13 步 R'（下）：右手将右层向下拉回 90°，对齐前层块。",
      "第 14 步 F'（前逆挑回）：右手大拇指向上挑回前层 90°，T-Perm 完美收官，六面瞬间还原！",
    ],
    completionCommentary:
      '手感炸裂！T-Perm 是速拧与盲拧的灵魂公式，熟练后整套 14 步只需 0.9 秒即可一气呵成！',
    focusLabel: '高亮顶层 PLL 待交换块（T 字形双角与双棱）',
    isCubieFocused: (c) => c.homePos[1] === 1 || c.type === 'center',
    checkGoal: (cube) => isCubeSolved(cube),
  },
  {
    id: 'cfop-pll-hperm',
    stageId: 'cfop',
    stageName: '阶段三 · CFOP 速拧进阶核心',
    badge: 'CFOP · PLL H-Perm',
    title: '[PLL 极速 · H-Perm] 中层 M2 十字四棱对换',
    subtitle: '中层拨片指法代表作：前后棱互换 + 左右棱互换，7 步对称秒杀',
    difficulty: '高阶',
    formula: 'M2 U M2 U2 M2 U M2',
    mnemonic: '中层半圈(M2) · 顶左(U) · 中层半圈(M2) · 顶半圈(U2) · 中层半圈(M2) · 顶左(U) · 中层半圈(M2)',
    summary:
      '当顶层四个角块已经全部对齐，而四个棱块恰好需要【前后对换 (UF↔UB) 且左右对换 (UL↔UR)】时，这就是著名的【H-Perm（十字对棱换）】。使用中层双拨指法 M2 配合顶层 U，公式完全回文对称：M2 U M2 U2 M2 U M2，熟练后可在 0.8 秒内完成收官！',
    holdingTip: '四角已对齐各面中心块，任意方向持握均可直接执行公式！',
    keyPoints: [
      '回文对称美学：正着读和倒着读完全一样（M2 - U - M2 - U2 - M2 - U - M2），看一眼就能终身不忘！',
      'M2 高手拨法：左手无名指与中指从底后方依次快速勾弹中层 (M) 两次，右手食指负责拨 U 与 U2。',
    ],
    introCommentary:
      '最后一课是视觉与指法极具观赏性的【H-Perm 十字四棱对换】！此时四个顶角已全部对齐，只需将前后棱互换、左右棱互换。公式完全回文对称（M2 U M2 U2 M2 U M2），任意方向持握均可直接启动！',
    stepCommentaries: [
      '第 1 步 M2（中层 180°）：左手无名指与中指从后下方连续拨动中层 M 两次（180°），把底面白色中心列翻上来参与交换。',
      '第 2 步 U（顶层左拨 90°）：右手食指向左拨顶层 90°，将待交换的左右棱块切入中层轨道。',
      '第 3 步 M2（中层 180°）：第二次拨动中层 180°，完成第一组对棱的交叉转运。',
      '第 4 步 U2（顶层 180° 对称中心）：整条回文公式的正中心！右手食指中指连拨顶层 180° 半圈。',
      '第 5 步 M2（中层 180°）：进入对称后半程——第三次拨动中层 180°。',
      '第 6 步 U（顶层左拨 90°）：右手食指向左拨顶层 90°，所有顶层贴纸已与中层对齐。',
      '第 7 步 M2（中层 180° 收官）：最后一次拨动中层 180°，黑白两列归位，四棱对换瞬间完成！',
    ],
    completionCommentary:
      '🎉 全课程大满贯达成！你已经从零基础认知、层先法 7 步还原，一路通关到 CFOP 速拧高阶公式，快去自由练习场挑战你的速拧最佳战绩吧！',
    focusLabel: '聚焦顶层 4 个对换棱块与中层 (M) 旋转轨道',
    isCubieFocused: (c) =>
      c.type === 'center' ||
      (c.type === 'edge' && c.homePos[1] === 1) ||
      c.homePos[0] === 0,
    checkGoal: (cube) => isCubeSolved(cube),
  },
];

export const STAGE_GROUPS: StageGroup[] = [
  {
    id: 'basics',
    title: '阶段一 · 零基础认知与记号',
    subtitle: '3 节课掌握魔方骨骼、国际符号与“上左下右”黄金手法',
    badgeColor: 'from-cyan-500/20 to-sky-500/10 text-cyan-300 border-cyan-500/30',
    lessons: LESSONS.filter((l) => l.stageId === 'basics'),
  },
  {
    id: 'lbl',
    title: '阶段二 · 入门层先法 (7步还原)',
    subtitle: '逐步学习典型盘面，再从同一个随机残局完成七步实战',
    badgeColor: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/30',
    lessons: LESSONS.filter((l) => l.stageId === 'lbl'),
  },
  {
    id: 'cfop',
    title: '阶段三 · CFOP 速拧进阶核心',
    subtitle: 'Cross 底十字规划 · F2L 角棱同时入槽 · OLL/PLL 高频一发入魂',
    badgeColor: 'from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/30',
    lessons: LESSONS.filter((l) => l.stageId === 'cfop'),
  },
];

export const YELLOW_CROSS_CASES = [
  { id: 'line', label: '横线' },
  { id: 'corner', label: '拐角' },
  { id: 'dot', label: '单点' },
] as const;

export type YellowCrossCase = typeof YELLOW_CROSS_CASES[number]['id'];

export function getYellowCrossExample(lesson: Lesson, example: YellowCrossCase): Lesson {
  if (example === 'line') return lesson;

  const parts = example === 'dot'
    ? ['先做一遍公式，把单点变成右前拐角。']
    : [];
  parts.push('做一遍公式，把右前拐角变成竖线。');
  const formula = [
    ...parts.map(() => lesson.formula), 'U', lesson.formula,
  ].join(' ');
  const moves = parseAlgorithm(lesson.formula);
  const stepCommentaries = [
    ...parts.flatMap((instruction) =>
      moves.map((token, index) => index === 0 ? `${instruction} 起手转 F。` : getMoveDefinition(token).nameZh)
    ),
    '现在黄色竖线在前、后两个位置。转 U，把竖线摆成横线。',
    ...lesson.stepCommentaries.map((text) => text.replace(/^第 \d+ 步 /, '')),
  ].map((text, index) => `第 ${index + 1} 步：${text}`);

  return {
    ...lesson,
    formula,
    introCommentary: example === 'dot'
      ? '顶面四个棱块都没有黄色朝上，只看到中心点。先把单点变成右前拐角。'
      : '顶面的黄棱在右、前两个位置，形成拐角。先把拐角变成竖线。',
    stepCommentaries,
  };
}

const layerByLayerGoals = LESSONS.filter((lesson) => lesson.stageId === 'lbl');
export const LAYER_BY_LAYER_STEPS = [
  '底层白十字', '底层白角', '中层四棱', '顶层黄十字', '顶面全黄', '顶层四角归位', '六面还原',
] as const;

function orientationKey(cube: Cubie[]): string {
  return `${getCubieAt(cube, 0, 1, 0)?.faces.U}${getCubieAt(cube, 0, 0, 1)?.faces.F}`;
}

// The top and front center colors identify each of the 24 whole-cube orientations.
const orientationCorrections = new Map(
  ['', 'x', 'x2', "x'", 'z', "z'"].flatMap((tip) =>
    ['', 'y', 'y2', "y'"].map((yaw) => {
      const rotation = [tip, yaw].filter(Boolean);
      return [orientationKey(applyAlgorithm(createSolvedCube(), rotation)), invertAlgorithm(rotation)] as const;
    })
  )
);

export function getLayerByLayerProgress(cube: Cubie[]): number {
  if (isCubeSolved(cube)) return layerByLayerGoals.length;
  const correction = orientationCorrections.get(orientationKey(cube)) ?? [];
  const orientedCube = correction.length > 0 ? applyAlgorithm(cube, correction) : cube;
  const next = layerByLayerGoals.findIndex((lesson) => !lesson.checkGoal(orientedCube));
  return next === -1 ? layerByLayerGoals.length : next;
}

export function getLessonInitialCube(lesson: Lesson): Cubie[] {
  const solved = createSolvedCube();
  const inv = invertAlgorithm(parseAlgorithm(lesson.formula));
  const end = applyAlgorithm(solved, lesson.exampleEndSetup ?? "");
  return applyAlgorithm(end, inv);
}

export function getActiveCommentary(params: {
  workspaceMode: 'course' | 'sandbox';
  lesson: Lesson;
  lessonTab: 'demo' | 'practice';
  demoStep: number;
  practiceStep: number;
  practiceHalfTurnPending: boolean;
  practiceHalfTurnToken: string | null;
  practiceErrors: string[];
  practiceJustSucceeded: boolean;
  autoSolveQueue: string[];
  timerRunning: boolean;
  isSandboxSolved: boolean;
  fullPracticeProgress: number | null;
  timerArmedAfterScramble: boolean;
}): ActiveCommentaryInfo {
  const {
    workspaceMode,
    lesson,
    lessonTab,
    demoStep,
    practiceStep,
    practiceHalfTurnPending,
    practiceHalfTurnToken,
    practiceErrors,
    practiceJustSucceeded,
    autoSolveQueue,
    timerRunning,
    isSandboxSolved,
    fullPracticeProgress,
    timerArmedAfterScramble,
  } = params;

  const moves = parseAlgorithm(lesson.formula);
  const total = moves.length;

  if (workspaceMode === 'sandbox') {
    if (autoSolveQueue.length > 0) {
      const nextTok = autoSolveQueue[0];
      const def = getMoveDefinition(nextTok);
      return {
        phase: 'sandbox',
        badgeText: `🎙️ 逆序求解实时解说（剩余 ${autoSolveQueue.length} 步）`,
        headline: `正在执行复原动作 [${def.token}]：${def.nameZh}（${def.fingerTrickZh}）`,
        detail: '系统已自动化简并反转历史转动栈，为你逐步回放六面复原轨迹。',
        speechText: `正在自动逆序还原，当前动作 ${def.nameZh}`,
        stepIndex: null,
      };
    }
    if (fullPracticeProgress !== null) {
      const nextStep = LAYER_BY_LAYER_STEPS[fullPracticeProgress];
      const headline = nextStep
        ? `当前目标：${nextStep}（已满足 ${fullPracticeProgress} / 7 个阶段目标）`
        : '七步实战完成，六面已还原！';
      return {
        phase: nextStep ? 'sandbox' : 'completed',
        badgeText: '七步实战 · 同一个随机盘面',
        headline,
        detail: nextStep ? '保持白色中心朝下、蓝色中心朝前。自由转动，目标会按当前盘面更新。' : '',
        speechText: headline,
        stepIndex: null,
      };
    }
    if (timerRunning) {
      return {
        phase: 'sandbox',
        badgeText: '🎙️ 速拧解说 · 竞速计时中',
        headline:
          '计时进行中！建议按「底白十字 Cross → 前两层 F2L → 顶面黄 OLL → 顶层归位 PLL」顺序还原。',
        detail: '提示：一旦检测到六面全部还原，秒表将自动停表并计入个人战绩榜。',
        speechText: '速拧计时进行中，请保持底白朝下，依次完成十字、前两层与顶层还原！',
        stepIndex: null,
      };
    }
    if (!isSandboxSolved) {
      return {
        phase: 'sandbox',
        badgeText: '🎙️ 自由沙盒解说 · 观察与实战',
        headline: timerArmedAfterScramble
          ? '已生成随机残局。观察盘面后，可按空格键或直接拨动开始计时。'
          : '当前可以自由拨动魔方。重新随机打乱可开启一轮新计时。',
        detail: '提示：如果中途卡壳，可随时点击右侧「一键教学回放还原」观看逆序复原动画。',
        speechText: '请观察盘面，规划底层十字的还原路线。',
        stepIndex: null,
      };
    }
    return {
      phase: 'sandbox',
      badgeText: '🎙️ 自由沙盒解说 · 六面已还原',
      headline:
        '当前魔方处于六面还原状态。点击右侧「随机打乱魔方」可生成 20 步随机练习打乱，开启你的计时实战！',
      detail: '你也可以直接在魔方上自由拨动任意层，练习“上左下右”、小鱼公式或 T-Perm 指法。',
      speechText: '当前魔方已六面还原，点击随机打乱魔方即可开启 速拧计时挑战。',
      stepIndex: null,
    };
  }

  // Course Mode - Demo Tab
  if (lessonTab === 'demo') {
    if (demoStep <= 0) {
      const firstMove = moves[0] ?? 'R';
      const firstStepText = lesson.stepCommentaries[0] ?? '';
      return {
        phase: 'intro',
        badgeText: `🎙️ 中文解说 · 初始态势观察 (0/${total})`,
        headline: lesson.introCommentary,
        detail: `下一步预告 [${firstMove}]：${firstStepText}`,
        speechText: `${lesson.title}。${lesson.introCommentary}`,
        stepIndex: null,
      };
    }

    if (demoStep < total) {
      const doneIdx = demoStep - 1;
      const doneMove = moves[doneIdx];
      const nextMove = moves[demoStep];
      const nextDef = getMoveDefinition(nextMove);
      const stepText = lesson.stepCommentaries[doneIdx] ?? '';
      return {
        phase: 'step',
        badgeText: `🎙️ 中文解说 · 第 ${demoStep}/${total} 步 (${doneMove})`,
        headline: stepText,
        detail: `即将执行第 ${demoStep + 1} 步 [${nextMove}]：${nextDef.nameZh}（${nextDef.fingerTrickZh}）`,
        speechText: stepText,
        stepIndex: doneIdx,
      };
    }

    // demoStep >= total
    const lastIdx = total - 1;
    const lastMove = moves[lastIdx] ?? '';
    const lastStepText = lesson.stepCommentaries[lastIdx] ?? '';
    return {
      phase: 'completed',
      badgeText: `🎙️ 中文解说 · 第 ${total}/${total} 步 (${lastMove}) & 还原总结`,
      headline: lastStepText,
      detail: `✅ 课程总结：${lesson.completionCommentary}`,
      speechText: `${lastStepText} ${lesson.completionCommentary}`,
      stepIndex: lastIdx,
    };
  }

  // Course Mode - Practice Tab
  if (practiceJustSucceeded || (practiceStep >= total && practiceErrors.length === 0)) {
    return {
      phase: 'completed',
      badgeText: '🎙️ 教练解说 · 跟练闯关成功！',
      headline: lesson.completionCommentary,
      detail: `💡 速记口诀巩固：${lesson.mnemonic}`,
      speechText: `恭喜通关！${lesson.completionCommentary}`,
      stepIndex: total - 1,
    };
  }

  if (practiceErrors.length > 0) {
    const lastErr = practiceErrors[practiceErrors.length - 1];
    const undoTok = invertMove(lastErr);
    const expectedMove = moves[practiceStep] ?? '';
    return {
      phase: 'practice-error',
      badgeText: '🎙️ 教练纠错解说 · 偏离修正指引',
      headline: `刚才误转了 ${lastErr}，偏离了第 ${practiceStep + 1} 步公式轨迹。请点击「撤销错步」或反向拨动 ${undoTok} 退回正轨！`,
      detail: `回到正轨后，第 ${practiceStep + 1} 步正确动作为 [${expectedMove}]：${lesson.stepCommentaries[practiceStep] ?? ''}`,
      speechText: `检测到误操作 ${lastErr}，请点击撤销错步或反向转动 ${undoTok} 退回第 ${practiceStep + 1} 步。`,
      stepIndex: practiceStep,
    };
  }

  if (practiceHalfTurnPending && practiceHalfTurnToken) {
    const expectedMove = moves[practiceStep] ?? '';
    return {
      phase: 'practice-half',
      badgeText: `🎙️ 教练跟练解说 · 第 ${practiceStep + 1}/${total} 步 (${expectedMove} 半圈进行中)`,
      headline: `第 ${practiceStep + 1} 步要求 180° 双转 [${expectedMove}]：你已完成前 90°（${practiceHalfTurnToken}），请再沿同方向拨动一次 ${practiceHalfTurnToken} 完成半圈！`,
      detail: lesson.stepCommentaries[practiceStep] ?? '',
      speechText: `已完成 90 度，请继续沿同方向再转一次 ${practiceHalfTurnToken} 完成 180 度双转。`,
      stepIndex: practiceStep,
    };
  }

  const currentExpectedIdx = Math.min(practiceStep, total - 1);
  const currentExpectedMove = moves[currentExpectedIdx] ?? '';
  const stepGuideText = lesson.stepCommentaries[currentExpectedIdx] ?? '';
  return {
    phase: 'practice-guide',
    badgeText: `🎙️ 教练跟练解说 · 请执行第 ${currentExpectedIdx + 1}/${total} 步 (${currentExpectedMove})`,
    headline: stepGuideText,
    detail:
      currentExpectedIdx === 0
        ? `🎯 持握基准：${lesson.holdingTip}`
        : `💡 速记口诀：${lesson.mnemonic}`,
    speechText: stepGuideText,
    stepIndex: currentExpectedIdx,
  };
}
