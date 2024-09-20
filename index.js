import fs from 'node:fs/promises'
import * as babel from '@babel/core'
import { pinyin } from 'pinyin-pro'

const exec = async () => {
  try {
    const regexp = /[\u4e00-\u9fa5]+/

    const file = await fs.readFile('./demo.js', {
      encoding: 'utf-8',
    })

    const ast = await babel.parseAsync(file.toString(), {
      sourceType: 'module',
    })

    if (ast == null) {
      return
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

    const { code } = await babel.transformFromAstAsync(ast)

    await fs.writeFile('./demo.cache.js', code, {
      encoding: 'utf-8',
    })
  } catch (error) {
    console.error(error)
  }
}

const generateKey = (chinese) => {
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

exec()
