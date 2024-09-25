import test from 'node:test'
import assert from 'node:assert'
import { transform, generateKey } from '../src/index.js'

test.describe('test transform code', () => {
  test.it('test variable declaration - var', async () => {
    const code = `
var a = '字面量';
    `.trim()
    const actual = await transform(code)
    const expected = `
var a = i18n("${generateKey('字面量')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test variable declaration - let', async () => {
    const code = `
let a = '字面量';
    `.trim()
    const actual = await transform(code)
    const expected = `
let a = i18n("${generateKey('字面量')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test variable declaration - const', async () => {
    const code = `
const a = '字面量';
    `.trim()
    const actual = await transform(code)
    const expected = `
const a = i18n("${generateKey('字面量')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test array expression', async () => {
    const code = `
const arr = [10, '字面量', true, null, undefined, Symbol(), 12n, [], {}];
    `.trim()
    const actual = await transform(code)
    const expected = `
const arr = [10, i18n("${generateKey('字面量')}"), true, null, undefined, Symbol(), 12n, [], {}];
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test object assignment', async () => {
    const code = `
const obj = {
  '键名键名': '键值键值',
  '键名': 10,
  10: '键值'
};
    `.trim()
    const actual = await transform(code)
    const expected = `
const obj = {
  [i18n("${generateKey('键名键名')}")]: i18n("${generateKey('键值键值')}"),
  [i18n("${generateKey('键名')}")]: 10,
  10: i18n("${generateKey('键值')}")
};
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test condition expression', async () => {
    const code = `
'条件' ? '结果1' : '结果2';
    `.trim()
    const actual = await transform(code)
    const expected = `
i18n("${generateKey('条件')}") ? i18n("${generateKey('结果1')}") : i18n("${generateKey('结果2')}");
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test if statement', async () => {
    const code = `
if ('条件') {}
    `.trim()
    const actual = await transform(code)
    const expected = `
if (i18n("${generateKey('条件')}")) {}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test switch statement', async () => {
    const code = `
switch ('条件') {
  case '条件':
    break
}
    `.trim()
    const actual = await transform(code)
    const expected = `
switch (i18n("${generateKey('条件')}")) {
  case i18n("${generateKey('条件')}"):
    break;
}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test while statement', async () => {
    const code = `
while ('条件') {}
    `.trim()
    const actual = await transform(code)
    const expected = `
while (i18n("${generateKey('条件')}")) {}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test for statement', async () => {
    const code = `
for (; '条件';) {}
    `.trim()
    const actual = await transform(code)
    const expected = `
for (; i18n("${generateKey('条件')}");) {}
    `.trim()
    assert.equal(actual, expected)
  })

  test.it('test template literal', async () => {
    const code = 'str = `字面量${12}abc${"abc"}abc${true}字面量`'
    const actual = await transform(code)
    const expected = 'str = `${i18n("' + generateKey('字面量') + '")}${12}abc${"abc"}abc${true}${i18n("' + generateKey('字面量') + '")}`;'
    assert.equal(actual, expected)
  })

  test.it('test jsx element', async () => {
    const code = `
var jsx = <div data-id="测试" data-name={"测试"}>测试</div>
    `.trim()
    const actual = await transform(code)
    const expected = `
var jsx = <div data-id={i18n("ceshi")} data-name={i18n("ceshi")}>{i18n("ceshi")}</div>;
    `.trim()
    assert.equal(actual, expected)
  })
})
