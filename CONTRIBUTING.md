# 参与贡献 (Contributing)

感谢你对 **CubeLab 3D (`rubiks-cube-academy`)** 的关注与支持！

## 开发流程

1. Fork 本仓库并克隆到本地：
   ```bash
   git clone https://github.com/<your-username>/rubiks-cube-academy.git
   cd rubiks-cube-academy
   npm install
   ```
2. 创建功能或修复分支：
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. 启动开发服务器调试：
   ```bash
   npm run dev
   ```
4. 提交前确保全部单元测试、严格类型检查与生产构建通过：
   ```bash
   npm test
   npx tsc --noUnusedLocals --noUnusedParameters --noEmit
   npm run build
   ```
5. 提交 Pull Request，并简要说明改动背景与验证方式。

## 课程与公式规范

- 所有魔方公式均须遵循 WCA 国际标准记号（`R L U D F B M E S x y z` 及宽转 `r/Rw` 等），并在 `src/engine/__tests__/cubeEngine.test.ts` 中通过状态还原与步骤解说长度校验。
