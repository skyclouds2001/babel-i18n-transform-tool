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

| option | type | default | description |
| --- | --- | --- | --- |
| `root` | `string` | `process.cwd()` | root execution path, will be used as relative path base of `input` and `output`, could be overwritten by `-r` `--root` |
| `input` | `string` | `process.cwd() + './index.js'` | input file(s) path, could be a relative path to process execution working dictionary, could be overwritten by `-i` `--input` |
| `output` | `string` | `options.input` | output file(s) path, could be a relative path to process execution working dictionary, could be overwritten by `-o` `--output` |
| `extensions` | `string[]` | `['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']` | additionally transform file extensions, will extend the default extensions list, could be overwritten by `--extensions` |
| `include` | `string \| string[]` | `'**'` | included transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, could be overwritten by `--include` |
| `exclude` | `string \| string[]` | `'**\node_modules\**'` | excluded transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, could be overwritten by `--exclude` |
| `autoImport` | `AutoImportOptions \| boolean` | `true` | whether automatically add help function import, could be overwritten by `--auto-import` |
| `functionIdentity` | `string` | `'i18n'` | the identity of the help function that will be used in code, could be overwritten by `--function-identity` |
| `exportSheet` | `ExportSheetOptions \| boolean` | `true` | whether export data to a sheet, could be overwritten by `--export-sheet` |
| `pretty` | `prettier.Options \| string \| boolean` | `true` | whether pretty the output file contents, can also be a prettier configuration object or prettier configuration file path, could be overwritten by `--pretty` |

## Cli

| cli option | accept type | default | description |
| --- | --- | --- | --- |
| `--root` | `string` | `process.cwd()` |  root execution path, will be used as relative path base of `input` and `output` |
| `-i`, `--input` | `string` | `process.cwd() + './index.js'` | input file(s) path, could be a relative path to process execution working dictionary |
| `-o`, `--output` | `string` | `options.input` | output file(s) path, could be a relative path to process execution working dictionary |
| `--extensions` | `string[]` | `['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']` | additionally transform file extensions, will extend the default extensions list |
| `--include` | `string \| string[]` | `'**'` | included transform file, accept a glob pattern, only take effect when `input` refer to a dictionary |
| `--exclude` | `string \| string[]` | `'**\node_modules\**'` | excluded transform file, accept a glob pattern, only take effect when `input` refer to a dictionary |
| `--auto-import` | `boolean` | `true` | whether automatically add help function import |
| `--import-identity` | `string` | `'i18n'` | the identity of the imported help function |
| `--import-source` | `string` | `'i18n'` | the source of the imported help function |
| `--function-identity` | `string` | `'i18n'` | the identity of the help function that will be used in code |
| `--export-sheet` | `boolean` | `true` | whether export data to a sheet |
| `--export-sheet-path` | `string` | `options.output` | the exported sheet file path |
| `--export-sheet-name` | `string` | `'data'` | the exported sheet file name |
| `--pretty` | `boolean` | `true` | whether pretty the output file contents |

## References

- [babel compiler](https://babeljs.io/)
- [babel ast standard](https://github.com/babel/babel/blob/main/packages/babel-parser/ast/spec.md)
- [jsx ast standard](https://github.com/facebook/jsx/blob/main/AST.md)
- [ast explorer](https://astexplorer.net/)
- [babel-plugin-handbook](https://github.com/acdlite/babel-plugin-handbook/blob/master/translations/zh-Hans/README.md)
