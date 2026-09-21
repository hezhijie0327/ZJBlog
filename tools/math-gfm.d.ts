// 实现在 math-gfm.js（自 micromark-extension-math 移植 + GitHub 规则补丁，
// 详见该文件头注）。tsc 只消费本声明，不检查 JS 实现。
declare function mathGfmFactory(): unknown;

export { mathGfmFactory as mathGfm };
