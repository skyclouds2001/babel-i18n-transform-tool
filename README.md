# i18n-transform-tool

## Usage

must specified the input path

```shell
npx i18n-transform-tool ./input.js

npx i18n-transform-tool ./src
```

can also specified the output path after the input path

```shell
npx i18n-transform-tool ./input.js ./output.js

npx i18n-transform-tool ./src ./src-output
```

can also call via script

```js
import { exec } from 'i18n-transform-tool'

exec({
  // ...options
})
```

## Options

| script option | cli option | accept type | default | description |
| --- | --- | --- | --- | --- |
| root | --root | `string` | `process.cwd()` | root execution path, will be used as relative path base of `input` and `output` |
| input | -i, --input | `string` | `process.cwd() + './index.js'` | input file(s) path, could be a relative path to process execution working dictionary |
| output | -o, --output | `string` | `options.input` | output file(s) path, could be a relative path to process execution working dictionary |
| extensions | --extensions | `string[]` | `['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']` | additionally transform file extensions, will extend the default extensions list |
| include | --include | `string \| string[]` | `'**'` | included transform file, accept a glob pattern, only take effect when `input` refer to a dictionary |
| exclude | --exclude | `string \| string[]` | `'**\node_modules\**'` | excluded transform file, accept a glob pattern, only take effect when `input` refer to a dictionary |
| autoImport | --auto-import | `boolean` | `true` | whether automatically add help function import |
| importIdentity | --import-identity | `string` | `'i18n'` | the identity of the imported help function |
| importSource | --import-source | `string` | `'i18n'` | the source of the imported help function |
| exportSheet | --export-sheet | `boolean` | `true` | whether export data to a sheet |
| exportSheetPath | --export-sheet-path | `string` | `options.output` | the exported sheet file path |
| exportSheetName | --export-sheet-name | `string` | `'data'` | the exported sheet file name |
| pretty | --pretty | `boolean` | `true` | whether pretty the output file contents |

## References

- [babel compiler](https://babeljs.io/)
- [babel ast standard](https://github.com/babel/babel/blob/main/packages/babel-parser/ast/spec.md)
- [jsx ast standard](https://github.com/facebook/jsx/blob/main/AST.md)
- [ast explorer](https://astexplorer.net/)
- [babel-plugin-handbook](https://github.com/acdlite/babel-plugin-handbook/blob/master/translations/zh-Hans/README.md)
