const typescript = require('rollup-plugin-typescript2');

module.exports = {
  input: 'src/index.ts',
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
    }),
  ],
  output: {
    file: 'dist/youtube-transcript-plus.js',
    format: 'cjs',
    exports: 'named',
  },
  external: ['fs/promises', 'path'],
};
