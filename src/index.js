// @ts-check

import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs/promises'
import minimist from 'minimist'
import * as babel from '@babel/core'
import { pinyin } from 'pinyin-pro'

const regexp = /[\u4e00-\u9fa5]+/

/**
 * @typedef {Object} Options transform execution options
 * @property {string} root root execution path, default to `process.cwd()`, could be overwritten by `-r` `-root`
 * @property {string} input input file(s) path, could be a relative path to process execution working dictionary, default to `process.cwd() + '/index.js'`, could be overwritten by `-i` `-input`
 * @property {string} output output file(s) path, could be a relative path to process execution working dictionary, default to `options.input`, could be overwritten by `-o` `-output`
 */

export const DEFAULT_EXECUTION_EXTENSIONS = ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx']

/**
 * the main execution process
 * @param {Options} options transform execution options
 * @returns {Promise<void>} none
 */
export async function exec(options) {
  try {
    const argv = minimist(process.argv.slice(2), { string: ['_'] })

    const resolvedOptions = resolveOptions(options, argv)

    const stats = await fs.stat(resolvedOptions.input)
    if (stats.isDirectory()) {
      const entries = await fs.readdir(resolvedOptions.input, { recursive: true, withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && DEFAULT_EXECUTION_EXTENSIONS.includes(path.extname(entry.name))) {
          const file = await fs.readFile(path.resolve(resolvedOptions.input, entry.parentPath ?? entry.path, entry.name), {
            encoding: 'utf-8',
          })
          const code = file.toString()

          const result = await transform(code, resolvedOptions)

          if (result == null) {
            return
          }

          await fs.writeFile(path.resolve(resolvedOptions.output, path.relative(resolvedOptions.input, entry.parentPath ?? entry.path), entry.name), result, {
            encoding: 'utf-8',
            flush: true,
          })
        }
      }
    }
    if (stats.isFile() && DEFAULT_EXECUTION_EXTENSIONS.includes(path.extname(resolvedOptions.input))) {
      const file = await fs.readFile(resolvedOptions.input, {
        encoding: 'utf-8',
      })
      const code = file.toString()

      const result = await transform(code, resolvedOptions)

      if (result == null) {
        return
      }

      await fs.writeFile(resolvedOptions.output, result, {
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
    plugins: [['@babel/plugin-syntax-typescript', { disallowAmbiguousJSXLike: true, isTSX: true }]],
    sourceType: 'unambiguous',
  })

  if (ast == null) {
    return null
  }

  babel.traverse(ast, {
    StringLiteral: (path) => {
      if (regexp.test(path.node.value)) {
        path.replaceWith(
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.value))],
          )
        )
      }
    },
    ObjectProperty: (path) => {
      if (babel.types.isStringLiteral(path.node.key) && regexp.test(path.node.key.value)) {
        path.node.key = babel.types.arrayExpression([
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.key.value))],
          )
        ])
      }
    },
    TemplateLiteral: (path) => {
      for (const node of [...(path.node.quasis)]) {
        if (regexp.test(node.value.cooked ?? node.value.raw)) {
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
      if (babel.types.isStringLiteral(path.node.value) && regexp.test(path.node.value.value)) {
        path.node.value = babel.types.jsxExpressionContainer(
          babel.types.callExpression(
            babel.types.identifier('i18n'),
            [babel.types.stringLiteral(generateKey(path.node.value.value))],
          )
        )
      }
    },
    JSXText: (path) => {
      if (regexp.test(path.node.value)) {
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
    plugins: [['@babel/plugin-syntax-typescript', { disallowAmbiguousJSXLike: true, isTSX: true }]],
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
 * @param {Options} options transform execution options
 * @param {minimist.ParsedArgs & Partial<Record<'input' | 'i' | 'output' | 'o' | 'root' | 'r', string>>} args options passing via cli
 * @returns {Readonly<Options>} resolved read-only transform execution options
 */
export function resolveOptions(options, args) {
  const ops = Object.assign({}, options)
  ops.root = args.root ?? args.r ?? ops.root ?? process.cwd()
  ops.input = args.input ?? args.i ?? args._.at(0) ?? ops.input ?? 'index.js'
  ops.output = args.output ?? args.o ?? args._.at(1) ?? ops.output ?? ops.input

  if (!path.isAbsolute(ops.input)) {
    ops.input = path.resolve(ops.root, ops.input)
  }
  if (!path.isAbsolute(ops.output)) {
    ops.output = path.resolve(ops.root, ops.output)
  }

  Object.freeze(ops)

  return ops
}
