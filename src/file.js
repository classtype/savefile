//--------------------------------------------------------------------------------------------------

const fs = require('fs').promises;
const path = require('path');
const async = require('async');

/*--------------------------------------------------------------------------------------------------
|
| -> Коды ошибок
|
|-------------------------------------------------------------------------------------------------*/

const error_msg = {
    '100': 'Неизвестная ошибка!',
    '101': 'Каталог не найден!',
    '104': 'В текущей директории уже существует каталог с таким именем!'
};

//--------------------------------------------------------------------------------------------------

module.exports = class {
    
/*--------------------------------------------------------------------------------------------------
|
| -> Конструктор
|
|-------------------------------------------------------------------------------------------------*/

    constructor(pathStorage = './', format = 'text') {
    // Путь к хранилищу файлов
        this.pathStorage = path.join(path.dirname(process.mainModule.filename), pathStorage+'');
        
    // Формат файлов по умолчанию
        this.format = 'text';
        
    // Формат файлов "json"
        if (format == 'json') {
            this.format = 'json';
        }
        
    // Очередь задач
        this.tasks = {};
        
    // Блокировка процесса выполнения
        this.processLock = {};
    }
    
/*--------------------------------------------------------------------------------------------------
|
| -> Реализация очередности выполнения задач
|
|-------------------------------------------------------------------------------------------------*/

    add(fileName, content, callback) {
        return this.action('add', fileName, content, callback);
    }
    set(fileName, content, callback) {
        return this.action('set', fileName, content, callback);
    }
    action(method, fileName, content, callback) {
    // Создаем путь к файлу
        let pathFile = path.join(this.pathStorage, fileName+'');
        
    // Создаем очередь задач для файла "pathFile"
        if (!this.tasks[pathFile]) {
            this.tasks[pathFile] = [];
        }
        
    // Возвращаем результат через промис
        return new Promise((resolve) => {
        // Добавляем в очередь новую задачу
            this.tasks[pathFile].push([method, pathFile, content, (res) => {
            // Возвращаем результат через пользовательский callback
                if (typeof callback == 'function') {
                    callback.call(res, res, res.content);
                }
                
            // Возвращаем результат через промис
                resolve(res);
            }]);
            
        // Запускаем очередь задач для файла "pathFile"
            this.task(pathFile);
        });
    }
    task(pathFile) {
        Promise.resolve().then(() => {
        // Проверяем есть ли еще задачи в очереди для файла "pathFile"
            if (!this.tasks[pathFile]) {
                return;
            }
            
        // Проверяем есть ли еще задачи в процессе выполнения для файла "pathFile"
            if (this.processLock[pathFile]) {
                return;
            }
            
        // Блокируем процесс выполнения для файла "pathFile"
            this.processLock[pathFile] = true;
            
        // Создаем запуск задачь по очереди
            let taskCallback = [];
            
        // Проходим по списку задач для файла "pathFile"
            for (let args of this.tasks[pathFile]) {
            // Добавляем задачу в очередь для запуска задачь по очереди
                taskCallback.push(
                    ((method, pathFile, content, resolve) => {
                        return (seriesNext) => {
                        // Удаляем задачу из очереди
                            this.tasks[pathFile].splice(0, 1);
                            
                        // Запускаем метод (add/set/get/del)
                            this['_'+method](method, pathFile, content, (res) => {
                            // Возвращаем результат через промис
                                resolve(res);
                                
                            // Переходим к следующей задачи по очереди
                                seriesNext();
                            });
                        };
                    }).apply(this, args)
                );
            }
            
        // Запускаем задачи по очереди для файла "pathFile"
            async.series(taskCallback, () => {
            // Запускаем очередь задач для файла "pathFile"
                this.task(pathFile);
                
            // Удаляем очередь задач для файла "pathFile"
                if (this.tasks[pathFile].length == 0) {
                    delete this.tasks[pathFile];
                }
                
            // Разблокируем процесс выполнения для файла "pathFile"
                delete this.processLock[pathFile];
            });
        });
    }
    
/*--------------------------------------------------------------------------------------------------
|
| -> Создание файла
|
|-------------------------------------------------------------------------------------------------*/

    async _add(method, pathFile, content, resolve) {
        try {
        // Проверяем существует-ли каталог в котором мы хотим создать файл
            await fs.stat(path.dirname(pathFile))
                .catch((err) => {
                // Ошибка 101 — "Каталог не найден!"
                    throw [101, path.dirname(pathFile) + path.sep];
                });
                
        // Проверяем существует-ли файл или каталог с таким именем
            await fs.stat(pathFile)
                .then((stats) => {
                // Это файл
                    if (stats.isFile()) {
                    // Ошибка 103 — "Файл с таким именем уже существует!"
                        throw [103, pathFile];
                    }
                    
                // Это каталог
                    if (stats.isDirectory()) {
                    // Ошибка 104 — "Каталог с таким именем уже существует!"
                        throw [104, pathFile];
                    }
                    
                // Это не файл и не каталог, но почему-то он найден
                    else {
                    // Ошибка 100 — "Неизвестная ошибка!"
                        throw [100, pathFile];
                    }
                })
                .catch((err) => {
                // Если файл не найден, то это не ошибка!
                    if (err[0]) {
                        throw err;
                    }
                });
                
        // Формат файлов "json"
            if (this.format == 'json') {
                content = JSON.stringify(content);
            }
            
        // Создаем файл
            await fs.writeFile(pathFile, content+'', 'utf8')
                .catch((err) => {
                // Ошибка 100 — "Неизвестная ошибка!"
                    throw [100, pathFile];
                });
                
        // Создаем результат
            throw ['good', pathFile];
        }
        
    // Возвращаем результат
        catch (res) {
            return this.result(method, res, resolve);
        }
    }
    
/*--------------------------------------------------------------------------------------------------
|
| -> Записать в файл
|
|-------------------------------------------------------------------------------------------------*/

    async _set(method, pathFile, content, resolve) {
        try {
        // Проверяем существует-ли каталог из которого мы хотим получить файл
            await fs.stat(path.dirname(pathFile))
                .catch((err) => {
                // Ошибка 101 — "Каталог не найден!"
                    throw [101, path.dirname(pathFile) + path.sep];
                });
                
        // Проверяем существует-ли файл с таким именем
            await fs.stat(pathFile)
                .then((stats) => {
                // Это не файл, а например каталог
                    if (!stats.isFile()) {
                        throw {isDirectory:true};
                    }
                })
                .catch((err) => {
                // Это не файл, а например каталог
                    if (err.isDirectory) {
                    // Ошибка 102 — "Файл не найден!"
                        throw [102, pathFile];
                    }
                    
                // Ошибка 102 — "Файл не найден!"
                    throw [102, pathFile];
                });
                
        // Формат файлов "json"
            if (this.format == 'json') {
                content = JSON.stringify(content);
            }
            
        // Записываем данные
            await fs.writeFile(pathFile, content+'', 'utf8')
                .catch((err) => {
                // Ошибка 100 — "Неизвестная ошибка!"
                    throw [100, pathFile];
                });
                
        // Создаем результат
            throw ['good', pathFile];
        }
        
    // Возвращаем результат
        catch (res) {
            return this.result(method, res, resolve);
        }
    }
    
/*--------------------------------------------------------------------------------------------------
|
| -> Создает результат через промис
|
|-------------------------------------------------------------------------------------------------*/

    result(method, res, resolve) {
    // Ошибка
        if (res[0] != 'good') {
            res = {status:'error', error_code:res[0], error_msg:error_msg[res[0]], path:res[1]};
        }
        
    // Успех
        else {
        // Создание файла
            if (method == 'add') {
                res = {status:'good', path:res[1]};
            }
            
        // Записать в файл
            if (method == 'set') {
                res = {status:'good', path:res[1]};
            }
        }
        
    // Возвращаем результат через промис
        resolve(res);
    }
};

//--------------------------------------------------------------------------------------------------