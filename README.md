## Что это?

**Savefile** — это [npm-пакет](https://www.npmjs.com/package/savefile)
с помощью которого вы можете быстро сохранить данные в файл.

## Быстрый пример

```js
require('savefile')(
    'storage/file1.txt',// Путь к файлу
    'Текст текст текст'// Содержимое
);
```

## Установка

```
$ npm i savefile
```

## Подключение

```js
const savefile = require('savefile');
```

## Использование как Promise

```js
let res = await savefile('storage/file1.txt', 'Текст 123');
console.log(res);
```

В директории `./storage` будет создан файл `file1.txt` с содержимым `Текст 123`

## Использование как Callback

```js
savefile('storage/file1.txt', 'Текст 456', (res) => {
    console.log(res);
});
```

Если файл был ранее создан, содержимое будет перезаписано.

#### Пример ответа

```js
{
    status: 'good',
    path: '/home/storage/file1.txt'
}
```

В ответе будет передано состояние операции — `status` и полный путь — `path`

#### Пример ошибки

```js
{
    status: 'error',
    error_code: 101,
    error_msg: 'Каталог не найден!',
    path: '/home/storage/'
}
```

В случае успеха `status` будет равен `good`, в случае ошибки `error`

## Коды ошибок

| error_code | error_msg                                                    |
| ---------- | ------------------------------------------------------------ |
| 100        | Неизвестная ошибка!                                          |
| 101        | Каталог не найден!                                           |
| 104        | В текущей директории уже существует каталог с таким именем!  |

Ошибка `104` возникает,
потому что в одной директории не могут одновременно находиться каталог и файл с одним именем.