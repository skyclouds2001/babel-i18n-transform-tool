var str = '字面量'

str = '字面量'

str = `字面量${text}字面量`

// var jsx = <div data-id="测试" data-name={"测试"}>测试</div>

const fn = () => {}

let arr = ['成员']

let obj = {
    '键名': 10,
    10: '键值',
    ['键值']: 'str',
    ['键值'] () {},
}

obj[10] = '字面量'

switch (str) {
    case '字面量':
        break
}

if ('字面量') {}

if (str !== '字面量') {}

for (;!'字面量';)

for (;str !== '字面量';)

while (!'字面量') {}

while (str !== '字面量') {}

'字面量' ? '字面量' : '字面量'
