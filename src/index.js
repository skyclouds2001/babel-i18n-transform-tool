// @ts-check

import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import minimist from 'minimist'
import { glob } from 'glob'
import * as babel from '@babel/core'
import { pinyin } from 'pinyin-pro'

const REGEXP = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/**
 * @typedef {Object} Options transform execution options
 * @property {string} root root execution path, will be used as relative path base of `input` and `output`, default to `process.cwd()`, could be overwritten by `-r` `--root`
 * @property {string} input input file(s) path, could be a relative path to process execution working dictionary, default to `process.cwd() + './index.js'`, could be overwritten by `-i` `--input`
 * @property {string} output output file(s) path, could be a relative path to process execution working dictionary, default to `options.input`, could be overwritten by `-o` `--output`
 * @property {string[]} extensions additionally transform file extensions, will extend the default extensions list, default to be `['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']`, could be overwritten by `--extensions`
 * @property {string | string[]} include included transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, default to be `'**'`, could be overwritten by `--include`
 * @property {string | string[]} exclude excluded transform file, accept a glob pattern, only take effect when `input` refer to a dictionary, default to be `'**\node_modules\**'`, could be overwritten by `--exclude`
 */

export const DEFAULT_EXECUTION_EXTENSIONS = ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']

export const DEFAULT_INCLUDE_FILES = '**'

export const DEFAULT_EXCLUDE_FILES = '**/node_modules/**'

/**
 * the main execution process
 * @param {Partial<Options>=} options transform execution options
 * @returns {Promise<void>} none
 */
export async function exec(options = {}) {
  try {
    const argv = minimist(process.argv.slice(2), { string: ['_', 'root', 'input', 'output', 'extensions', 'include', 'exclude'] })

    const resolvedOptions = resolveOptions(options, argv)

    const stats = await fsPromises.stat(resolvedOptions.input)
    if (stats.isDirectory()) {
      const entries = await glob(resolvedOptions.include, {
        ignore: resolvedOptions.exclude,
        cwd: resolvedOptions.input,
        withFileTypes: true,
      })
      for (const entry of entries) {
        if (entry.isFile() && resolvedOptions.extensions.includes(path.extname(entry.name))) {
          const file = await fsPromises.readFile(path.resolve(resolvedOptions.input, entry.parentPath ?? entry.path, entry.name), {
            encoding: 'utf-8',
          })
          const code = file.toString()

          const result = await transform(code, resolvedOptions)

          if (result == null) {
            return
          }

          await fsPromises.writeFile(path.resolve(resolvedOptions.output, path.relative(resolvedOptions.input, entry.parentPath ?? entry.path), entry.name), result, {
            encoding: 'utf-8',
            flush: true,
          })
        }
      }
    }
    if (stats.isFile() && resolvedOptions.extensions.includes(path.extname(resolvedOptions.input))) {
      const file = await fsPromises.readFile(resolvedOptions.input, {
        encoding: 'utf-8',
      })
      const code = file.toString()

      const result = await transform(code, resolvedOptions)

      if (result == null) {
        return
      }

      await fsPromises.writeFile(resolvedOptions.output, result, {
        encoding: 'utf-8',
      })
    }
  } catch (error) {
    console.error(error)
  }
}

/**
 * transform input code to output code with chinese string replaced
 * @param {string} input untransformed code
 * @param {Readonly<Options>} options transform execution options
 * @returns {Promise<string | null>} transformed code
 */
export async function transform(input, options) {
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
      if (!path.node.body.some(node => babel.types.isImportDeclaration(node) && node.specifiers.some(nd => nd.local.name === 'i18n') && node.source.value === './i18n')) {
        path.node.body.unshift(
          babel.types.importDeclaration(
            [
              babel.types.importSpecifier(
                babel.types.identifier('i18n'),
                babel.types.identifier('i18n'),
              )
            ],
            babel.types.stringLiteral('./i18n'),
          ),
        )
      }
    },
    StringLiteral: (path) => {
      if (REGEXP.test(path.node.value)) {
        path.replaceWith(
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.value))],
          )
        )
      }
    },
    ObjectProperty: (path) => {
      if (babel.types.isStringLiteral(path.node.key) && REGEXP.test(path.node.key.value)) {
        path.node.key = babel.types.arrayExpression([
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.key.value))],
          )
        ])
      }
      if (babel.types.isIdentifier(path.node.key) && REGEXP.test(path.node.key.name)) {
        path.node.key = babel.types.arrayExpression([
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.key.name))],
          )
        ])
      }
    },
    TemplateLiteral: (path) => {
      for (const node of Array.from(path.node.quasis)) {
        if (REGEXP.test(node.value.cooked ?? node.value.raw)) {
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
              babel.types.identifier('i18n'),
              [babel.types.stringLiteral(generateKey(node.value.cooked ?? node.value.raw))],
            ),
          )
        }
      }
    },
    JSXAttribute: (path) => {
      if (babel.types.isStringLiteral(path.node.value) && REGEXP.test(path.node.value.value)) {
        path.node.value = babel.types.jsxExpressionContainer(
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.value.value))],
          )
        )
      }
    },
    JSXText: (path) => {
      if (REGEXP.test(path.node.value)) {
        path.replaceWith(
          babel.types.jsxExpressionContainer(
            babel.types.callExpression(
              babel.types.identifier('i18n'),
              [babel.types.stringLiteral(generateKey(path.node.value))],
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
  })

  if (result == null || result.code == null) {
    return null
  }

  return result.code
}

/**
 * generate i18n key from chinese string
 * @param {string} chinese chinese string
 * @returns {string} i18n key
 */
export function generateKey(chinese) {
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
 * @param {Partial<Options>} options transform execution options
 * @param {minimist.ParsedArgs & Partial<Record<'input' | 'i' | 'output' | 'o' | 'root' | 'r' | 'extensions' | 'include' | 'exclude', string | string[]>>} args options passing via cli
 * @returns {Readonly<Options>} resolved read-only transform execution options
 */
export function resolveOptions(options, args) {
  const ops = {}
  ops.root = toString(args.root ?? args.r ?? options.root ?? process.cwd())
  ops.input = toString(args.input ?? args.i ?? args._.at(0) ?? options.input ?? 'index.js')
  ops.output = toString(args.output ?? args.o ?? args._.at(1) ?? options.output ?? ops.input)
  ops.extensions = DEFAULT_EXECUTION_EXTENSIONS.concat(toArray(args.extensions ?? options.extensions ?? []))
  ops.include = toArray(args.include ?? options.include ?? DEFAULT_INCLUDE_FILES)
  ops.exclude = toArray(args.exclude ?? options.exclude ?? DEFAULT_EXCLUDE_FILES)

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

  Object.freeze(ops)

  return ops
}

/**
 * transform string or string array to string array
 * @param {string | string[]} data input
 * @returns {string[]} output
 */
function toArray(data) {
  return Array.isArray(data) ? data : [data]
}

/**
 * transform string or string array to string array
 * @param {string | string[]} data input
 * @returns {string} output
 */
function toString(data) {
  return Array.isArray(data) ? (data.at(-1) ?? '') : data
}
