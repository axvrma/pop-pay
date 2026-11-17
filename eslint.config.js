import js from '@eslint/js'
import ts from 'typescript-eslint'
import globals from 'globals'
import hooks from 'eslint-plugin-react-hooks'

export default ts.config(
  { ignores: ['dist/**', '.next/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['src/**/*.{tsx,ts}'],
    plugins: { 'react-hooks': hooks },
    rules: hooks.configs.recommended.rules,
  },
)
