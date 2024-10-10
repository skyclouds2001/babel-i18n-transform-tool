import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import minimist from 'minimist'
import { glob } from 'glob'
import * as babel from '@babel/core'
import { pinyin } from 'pinyin-pro'
import * as prettier from 'prettier'
import * as xlsx from 'xlsx'

xlsx.set_fs(fs)

const REGEXP = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/**
 * script execution options
 */
interface Options {
  /**
   * root execution path, will be used as relative path base of `input` and `output`, default to `process.cwd()`, could be overwritten by `-r` `--root`
   */
  root: string

  /**
   * input file(s) path, could be a relative path to process execution working dictionary, default to `process.cwd() + './index.js'`, could be overwritten by `-i` `--input`
   */
  input: string

  /**
   * output file(s) path, could be a relative path to process execution working dictionary, default to `options.input`, could be overwritten by `-o` `--output`
   */
  output: string

  /**
   * additionally transform file extensions, will extend the default extensions list, default to be `['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']`, could be overwritten by `--extensions`
   */
  extensions: string[]

  /**
   * included transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, default to be `'**'`, could be overwritten by `--include`
   */
  include: string | string[]

  /**
   * excluded transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, default to be `'**\node_modules\**'`, could be overwritten by `--exclude`
   */
  exclude: string | string[]

  /**
   * whether automatically add help function import, default to be `true`, could be overwritten by `--auto-import`
   */
  autoImport: AutoImportOptions | boolean

  /**
   * the identity of the help function that will be used in code, default to be `'i18n'`, could be overwritten by `--function-identity`
   */
  functionIdentity: string

  /**
   * whether export data to a sheet, default to be `true`, could be overwritten by `--export-sheet`
   */
  exportSheet: ExportSheetOptions | boolean

  /**
   * whether pretty the output file contents, can also be a prettier configuration object or prettier configuration file path, default to `true`, could be overwritten by `--pretty`
   */
  pretty: prettier.Options | string | boolean
}

/**
 * export sheet options
 */
interface ExportSheetOptions {
  /**
   * the exported sheet file path, default to be `options.output`, could be overwritten by `--export-sheet-path`
   */
  path: string

  /**
   * the exported sheet file name, default to be `'data'`, could be overwritten by `--export-sheet-name`
   */
  name: string
}

/**
 * auto import options
 */
interface AutoImportOptions {
  /**
   * the identity of the imported help function, default to be `'i18n'`, could be overwritten by `--import-identity`
   */
  identity: string

  /**
   * the source of the imported help function, default to be `'i18n'`, could be overwritten by `--import-source`
   */
  source: string
}

interface ResolvedOptions extends Readonly<Omit<Options, 'autoImport' | 'exportSheet' | 'pretty'>> {
  readonly autoImport: Exclude<Options['autoImport'], true>

  readonly exportSheet: Exclude<Options['exportSheet'], true>

  readonly pretty: Exclude<Options['pretty'], string>
}

/**
 * cli execution options
 */
interface Args {
  /**
   * root execution path, will be used as relative path base of `input` and `output`, default to `process.cwd()`
   */
  root: string

  /**
   * alias for `root`
   */
  r: string

  /**
   * input file(s) path, could be a relative path to process execution working dictionary, default to `process.cwd() + './index.js'`
   */
  input: string

  /**
   * alias for `input`
   */
  i: string

  /**
   * output file(s) path, could be a relative path to process execution working dictionary, default to `options.input`
   */
  output: string

  /**
   * alias for `output`
   */
  o: string

  /**
   * additionally transform file extensions, will extend the default extensions list, default to be `['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']`
   */
  extensions: string[]

  /**
   * included transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, default to be `'**'`
   */
  include: string | string[]

  /**
   * excluded transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, default to be `'**\node_modules\**'`
   */
  exclude: string | string[]

  /**
   * whether automatically add help function import, default to be `true`
   */
  'auto-import': boolean

  /**
   * the identity of the imported help function, default to be `'i18n'`
   */
  'import-identity': string

  /**
   * the source of the imported help function, default to be `'i18n'`
   */
  'import-source': string

  /**
   * the identity of the help function that will be used in code, default to be `'i18n'`
   */
  'function-identity': string

  /**
   * whether export data to a sheet, default to be `true`
   */
  'export-sheet': boolean

  /**
   * the exported sheet file path, default to be `options.output`
   */
  'export-sheet-path': string

  /**
   * the exported sheet file name, default to be `'data'`
   */
  'export-sheet-name': string

  /**
   * whether pretty the output file contents, default to `true`
   */
  'pretty': boolean
}

/**
 * export sheet data basic structure
 */
interface Record {
  /**
   * data origin
   */
  origin: string

  /**
   * generated key
   */
  key: string

  /**
   * zh-CN data
   */
  zh_CN: string
}

export const DEFAULT_EXECUTION_EXTENSIONS = ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']

export const DEFAULT_INCLUDE_FILES = '**'

export const DEFAULT_EXCLUDE_FILES = '**/node_modules/**'

/**
 * the main execution process
 * @param options transform execution options
 */
export async function exec(options: Partial<Options> = {}): Promise<void> {
  try {
    const argv = minimist<Partial<Args>>(
      process.argv.slice(2),
      {
        string: ['_', 'root', 'input', 'output', 'extensions', 'include', 'exclude', 'import-identity', 'import-source', 'export-sheet-path', 'export-sheet-name', 'function-identity'],
        boolean: ['auto-import', 'export-sheet', 'pretty'],
      },
    )

    const resolvedOptions = await resolveOptions(options, argv)

    await prettier.clearConfigCache()
    const prettier_options = typeof resolvedOptions.pretty === 'object' ? resolvedOptions.pretty : (resolvedOptions.pretty ? (await prettier.resolveConfig(resolvedOptions.input) ?? {}) : {})

    const data = new Map()

    const stats = await fs.promises.stat(resolvedOptions.input)
    if (stats.isDirectory()) {
      const entries = await glob(resolvedOptions.include, {
        ignore: resolvedOptions.exclude,
        cwd: resolvedOptions.input,
        withFileTypes: true,
      })
      for (const entry of entries) {
        if (entry.isFile() && resolvedOptions.extensions.includes(path.extname(entry.name))) {
          const file = await fs.promises.readFile(path.resolve(resolvedOptions.input, entry.parentPath ?? entry.path, entry.name), {
            encoding: 'utf-8',
          })
          const code = file.toString()

          const transformed_code = await transform(code, resolvedOptions, data)

          if (transformed_code == null) {
            return
          }

          const prettied_code = resolvedOptions.pretty ? (await prettier.format(transformed_code, Object.assign(prettier_options, { filepath: path.resolve(resolvedOptions.input, entry.parentPath ?? entry.path, entry.name) }))) : transformed_code

          await fs.promises.writeFile(path.resolve(resolvedOptions.output, path.relative(resolvedOptions.input, entry.parentPath ?? entry.path), entry.name), prettied_code, {
            encoding: 'utf-8',
            flush: true,
          })
        }
      }
    }
    if (stats.isFile() && resolvedOptions.extensions.includes(path.extname(resolvedOptions.input))) {
      const file = await fs.promises.readFile(resolvedOptions.input, {
        encoding: 'utf-8',
      })
      const code = file.toString()

      const transformed_code = await transform(code, resolvedOptions, data)

      if (transformed_code == null) {
        return
      }

      const prettied_code = resolvedOptions.pretty ? (await prettier.format(transformed_code, Object.assign(prettier_options, { filepath: resolvedOptions.input }))) : transformed_code

      await fs.promises.writeFile(resolvedOptions.output, prettied_code, {
        encoding: 'utf-8',
        flush: true,
      })
    }

    if (resolvedOptions.exportSheet) {
      exportSheet(Array.from(data).map((v) => v[1]), path.resolve(resolvedOptions.exportSheet.path, `${resolvedOptions.exportSheet.name}.xlsx`))
    }
  } catch (error) {
    console.error(error)
  }
}

/**
 * transform input code to output code with chinese string replaced
 * @param input untransformed code
 * @param options transform execution options
 * @param data store to cache transform key-value pairs
 * @returns transformed code
 */
export async function transform(input: string, options: ResolvedOptions, data: Map<string, Record>): Promise<string | null> {
  const ast = await babel.parseAsync(input, {
    plugins: [
      [
        '@babel/plugin-syntax-typescript',
        {
          disallowAmbiguousJSXLike: true,
          isTSX: true,
        },
      ],
    ],
    sourceType: 'unambiguous',
  })

  if (ast == null) {
    return null
  }

  babel.traverse(ast, {
    Program: (path) => {
      if (options.autoImport && !path.node.body.some(node => babel.types.isImportDeclaration(node) && node.specifiers.some(nd => nd.local.name === (options.autoImport as AutoImportOptions).identity) && node.source.value === (options.autoImport as AutoImportOptions).source)) {
        path.node.body.unshift(
          babel.types.importDeclaration(
            [
              babel.types.importSpecifier(
                babel.types.identifier(options.functionIdentity),
                babel.types.identifier(options.autoImport.identity),
              )
            ],
            babel.types.stringLiteral(options.autoImport.source),
          ),
        )
      }
    },
    StringLiteral: (path) => {
      if (babel.types.isTSLiteralType(path.parentPath.node)) {
        return
      }

      if (REGEXP.test(path.node.value)) {
        const raw = path.node.value.trim().replace(/\s+/g, '')
        const key = generateKey(raw)
        data.set(raw, {
          origin: raw,
          key: key,
          zh_CN: raw,
        })

        path.replaceWith(
          babel.types.callExpression(
            babel.types.identifier(options.functionIdentity),
            [babel.types.stringLiteral(key)],
          )
        )
      }
    },
    ObjectProperty: (path) => {
      if (babel.types.isStringLiteral(path.node.key) && REGEXP.test(path.node.key.value)) {
        const raw = path.node.key.value.trim().replace(/\s+/g, '')
        const key = generateKey(raw)
        data.set(raw, {
          origin: raw,
          key: key,
          zh_CN: raw,
        })

        path.node.key = babel.types.arrayExpression([
          babel.types.callExpression(
            babel.types.identifier(options.functionIdentity),
            [babel.types.stringLiteral(key)],
          )
        ])
      }
      if (babel.types.isIdentifier(path.node.key) && REGEXP.test(path.node.key.name)) {
        const raw = path.node.key.name.trim().replace(/\s+/g, '')
        const key = generateKey(raw)
        data.set(raw, {
          origin: raw,
          key: key,
          zh_CN: raw,
        })

        path.node.key = babel.types.arrayExpression([
          babel.types.callExpression(
            babel.types.identifier(options.functionIdentity),
            [babel.types.stringLiteral(key)],
          )
        ])
      }
    },
    TemplateLiteral: (path) => {
      if (babel.types.isTSLiteralType(path.parentPath.node)) {
        return
      }

      for (const node of Array.from(path.node.quasis)) {
        if (REGEXP.test(node.value.cooked ?? node.value.raw)) {
          const raw = (node.value.cooked ?? node.value.raw).trim().replace(/\s+/g, '')
          const key = generateKey(raw)
          data.set(raw, {
            origin: raw,
            key: key,
            zh_CN: raw,
          })

          const index = path.node.quasis.indexOf(node)
          path.node.quasis.splice(
            index,
            1,
            babel.types.templateElement({ raw: '', cooked: '' }, false),
            babel.types.templateElement({ raw: '', cooked: '' }, index === path.node.quasis.length - 1),
          )
          path.node.expressions.splice(
            index,
            0,
            babel.types.callExpression(
              babel.types.identifier(options.functionIdentity),
              [babel.types.stringLiteral(key)],
            ),
          )
        }
      }
    },
    JSXAttribute: (path) => {
      if (babel.types.isStringLiteral(path.node.value) && REGEXP.test(path.node.value.value)) {
        const raw = path.node.value.value.trim().replace(/\s+/g, '')
        const key = generateKey(raw)
        data.set(raw, {
          origin: raw,
          key: key,
          zh_CN: raw,
        })

        path.node.value = babel.types.jsxExpressionContainer(
          babel.types.callExpression(
            babel.types.identifier(options.functionIdentity),
            [babel.types.stringLiteral(key)],
          )
        )
      }
    },
    JSXText: (path) => {
      if (REGEXP.test(path.node.value)) {
        const raw = path.node.value.trim().replace(/\s+/g, '')
        const key = generateKey(raw)
        data.set(raw, {
          origin: raw,
          key: key,
          zh_CN: raw,
        })

        path.replaceWith(
          babel.types.jsxExpressionContainer(
            babel.types.callExpression(
              babel.types.identifier(options.functionIdentity),
              [babel.types.stringLiteral(key)],
            )
          )
        )
      }
    },
  })

  const result = await babel.transformFromAstAsync(ast, undefined, {
    plugins: [
      [
        '@babel/plugin-syntax-typescript',
        {
          disallowAmbiguousJSXLike: true,
          isTSX: true,
        },
      ],
    ],
    retainLines: true,
  })

  if (result == null || result.code == null) {
    return null
  }

  return result.code
}

/**
 * generate i18n key from chinese string
 * @param chinese chinese string
 * @returns i18n key
 */
export function generateKey(chinese: string): string {
  const py = pinyin(chinese, { toneType: 'none', type: 'array' })
  if (py.length >= 16) {
    return py.map(v => v.slice(0, 1)).join('')
  }
  if (py.length >= 8) {
    return py.map(v => v.slice(0, 2)).join('')
  }
  if (py.length >= 4) {
    return py.map(v => v.slice(0, 4)).join('')
  }
  return py.join('')
}

/**
 * resolve options and arguments
 * @param options transform execution options
 * @param args options passing via cli
 * @returns resolved read-only transform execution options
 */
async function resolveOptions(options: Partial<Options>, args: minimist.ParsedArgs & Partial<Args>): Promise<ResolvedOptions> {
  const ops = {} as Partial<Options>
  ops.root = toString(args.root ?? args.r ?? options.root ?? process.cwd())
  ops.input = toString(args.input ?? args.i ?? args._.at(0) ?? options.input ?? 'index.js')
  ops.output = toString(args.output ?? args.o ?? args._.at(1) ?? options.output ?? ops.input)
  if (!path.isAbsolute(ops.input)) {
    ops.input = path.resolve(ops.root, ops.input)
  }
  if (!path.isAbsolute(ops.output)) {
    ops.output = path.resolve(ops.root, ops.output)
  }
  const i = fs.statSync(ops.input)
  const o = fs.statSync(ops.output)
  if (i.isDirectory() && o.isFile() || i.isFile() && o.isDirectory()) {
    ops.output = ops.input
  }

  ops.extensions = DEFAULT_EXECUTION_EXTENSIONS.concat(toArray(args.extensions ?? options.extensions ?? []))
  ops.include = toArray(args.include ?? options.include ?? DEFAULT_INCLUDE_FILES)
  ops.exclude = toArray(args.exclude ?? options.exclude ?? DEFAULT_EXCLUDE_FILES)

  ops.autoImport = (args['auto-import'] === false || options.autoImport === false) ? false : {
    identity: args['import-identity'] ?? (typeof options.autoImport === 'object' ? options.autoImport.identity : 'i18n'),
    source: args['import-source'] ?? (typeof options.autoImport === 'object' ? options.autoImport.source : 'i18n'),
  }

  ops.functionIdentity = args['function-identity'] ?? options.functionIdentity ?? 'i18n'

  ops.exportSheet = (args['export-sheet'] === false || options.exportSheet === false) ? false : {
    path: args['export-sheet-path'] ?? (typeof options.exportSheet === 'object' ? options.exportSheet.path : ops.output),
    name: args['export-sheet-name'] ?? (typeof options.exportSheet === 'object' ? options.exportSheet.name : 'data'),
  }

  ops.pretty = args.pretty ?? (typeof options.pretty === 'string' ? (await import(options.pretty)) : (options.pretty ?? true))

  Object.freeze(ops)

  return ops as ResolvedOptions
}

/**
 * export data to excel utils
 * @param data export data
 * @param file output file path
 */
function exportSheet(data: Record[], file: string): void {
  const worksheet = xlsx.utils.json_to_sheet(data)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet)
  xlsx.writeFile(workbook, file)
}

/**
 * transform string or string array to string array
 * @param data input
 * @returns output
 */
function toArray(data: string | string[]): string[] {
  return Array.isArray(data) ? data : [data]
}

/**
 * transform string or string array to string
 * @param data input
 * @returns output
 */
function toString(data: string | string[]): string {
  return Array.isArray(data) ? (data.at(-1) ?? '') : data
}
