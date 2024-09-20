// @ts-check

import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs/promises'
import * as babel from '@babel/core'
import { pinyin } from 'pinyin-pro'

const regexp = /[\u4e00-\u9fa5]+/

/**
 * @typedef {Object} Options cli options
 * @property {string} input input file path, could be a relative path to process exec working dictionary
 * @property {string} output output file path, could be a relative path to process exec working dictionary
 */

/**
 * the main exec process
 * @param {Options} options exec options
 * @returns {Promise<void>} none
 */
export async function exec (options) {
  try {
    const { input, output } = options

    const cwd = process.cwd()

    const file = await fs.readFile(path.resolve(cwd, input), {
      encoding: 'utf-8',
    })
    const code = file.toString()

    const result = await transform(code)

    if (result == null) {
      return
    }

    await fs.writeFile(path.resolve(cwd, output), result, {
      encoding: 'utf-8',
    })
  } catch (error) {
    console.error(error)
  }
}

/**
 * transform input code to output code with chinese string replaced
 * @param {string} input untransformed code
 * @returns {Promise<string | null>} transformed code
 */
export async function transform(input) {
  const ast = await babel.parseAsync(input, {
    sourceType: 'module',
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
        path.node.key = babel.types.callExpression(
          babel.types.identifier('i18n'),
          [babel.types.stringLiteral(generateKey(path.node.key.value))],
        )
      }
    }
  })

  const result = await babel.transformFromAstAsync(ast)

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
export function generateKey (chinese) {
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
