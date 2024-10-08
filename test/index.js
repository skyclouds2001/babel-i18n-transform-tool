import test from 'node:test'
import assert from 'node:assert'
import { transform, generateKey } from '../src/index.js'

test.describe('should be able to transform code', () => {
  const options = Object.freeze({})

  test.it('should support transform variable declaration - var', async () => {
    const code = `
var a = '字面量';
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
var a = i18n("${generateKey('字面量')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform variable declaration - let', async () => {
    const code = `
let a = '字面量';
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
let a = i18n("${generateKey('字面量')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform variable declaration - const', async () => {
    const code = `
const a = '字面量';
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
const a = i18n("${generateKey('字面量')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform array expression', async () => {
    const code = `
const arr = [10, '字面量', true, null, undefined, Symbol(), 12n, [], {}];
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
const arr = [10, i18n("${generateKey('字面量')}"), true, null, undefined, Symbol(), 12n, [], {}];
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform object assignment', async () => {
    const code = `
const obj = {
  '键名键名': '键值键值',
  '键名': 10,
  键名: true,
  10: '键值'
};
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
const obj = {
  [i18n("${generateKey('键名键名')}")]: i18n("${generateKey('键值键值')}"),
  [i18n("${generateKey('键名')}")]: 10,
  [i18n("${generateKey('键名')}")]: true,
  10: i18n("${generateKey('键值')}")
};
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform condition expression', async () => {
    const code = `
'条件' ? '结果1' : '结果2';
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
i18n("${generateKey('条件')}") ? i18n("${generateKey('结果1')}") : i18n("${generateKey('结果2')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform if-else statement', async () => {
    const code = `
if ('条件') {}
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
if (i18n("${generateKey('条件')}")) {}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform switch-case statement', async () => {
    const code = `
switch ('条件') {
  case '条件':
    break
}
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
switch (i18n("${generateKey('条件')}")) {
  case i18n("${generateKey('条件')}"):
    break;
}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform while statement', async () => {
    const code = `
while ('条件') {}
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
while (i18n("${generateKey('条件')}")) {}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform for statement', async () => {
    const code = `
for (; '条件';) {}
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
for (; i18n("${generateKey('条件')}");) {}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform template literal', async () => {
    const code = 'str = `字面量${12}abc${"abc"}abc${true}字面量`'
    const actual = await transform(code, options)
    const expected = 'import { i18n } from "i18n";\nstr = `${i18n("' + generateKey('字面量') + '")}${12}abc${"abc"}abc${true}${i18n("' + generateKey('字面量') + '")}`;'
    assert.equal(actual, expected)
  })

  test.it('should support transform jsx element', async () => {
    const code = `
var jsx = <div data-id="测试" data-name={"测试"}>测试</div>
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
var jsx = <div data-id={i18n("ceshi")} data-name={i18n("ceshi")}>{i18n("ceshi")}</div>;
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should support transform typescript declaration', async () => {
    const code = `
const ts = [12, "测试", true] as const;
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
const ts = [12, i18n("ceshi"), true] as const;
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should not import help function if existed already', async () => {
    const code = `
import { i18n } from "i18n";
    `.trim()
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('should not transform chinese when used as type definition', async () => {
    const code = `
interface u {
  t: '测试';
}
type r = '测试';
    `.trim() + "\ntype t = `测试${'测试'}测试`;"
    const actual = await transform(code, options)
    const expected = `
import { i18n } from "i18n";
interface u {
  t: '测试';
}
type r = '测试';
    `.trim() + "\ntype t = `测试${'测试'}测试`;"
    assert.equal(actual, expected)
  })
})
