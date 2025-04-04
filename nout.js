import { Worker } from 'worker_threads';
import { join, dirname } from 'path'; // Импортируем join и dirname для работы с путями
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';

// Получаем __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7443919586:AAG3S5k1dAkR-kIW66p-EubIgv22mogdi58';

const tgBot = new TelegramBot(token, { polling: true });

// Массив с ботами
const bots = [
    { username: 'don_lazerson', password: 'ggggg', anarchy: 604, type: 'ender', inventoryPort: 3000, balance: undefined, msgID: 0 },
    { username: 'papa_michail', password: 'ggggg', anarchy: 604, type: 'sword6', inventoryPort: 3001, balance: undefined, msgID: 0 },
    { username: 'deda_serezha', password: 'ggggg', anarchy: 604, type: 'megasword', inventoryPort: 3002, balance: undefined, msgID: 0 },
];

// Функция для запуска Worker'ов
// Массив для хранения ссылок на воркеров
let workers = [];

// Функция для запуска Worker'ов
function runWorker(bot) {
    return new Promise((resolve, reject) => {
        // Строим путь к скрипту для конкретного типа бота
        const workerScriptPath = join(__dirname, `${bot.type}.js`);

        // Запускаем worker с переданным типом и данными бота
        const worker = new Worker(workerScriptPath, {
            workerData: bot // Передаем данные бота в worker
        });

        workers.push(worker); // Добавляем воркер в массив

        worker.on('message', (message) => {
            if (message.name === 'balance') {
                const currentBot = bots.find(bot => bot.username === message.username);
                currentBot.balance = message.balance;
                let msg = 'Баланс'
                msg += `\n${message.username}: ${Math.floor(message.balance/1000000)}кк`
                if (!currentBot.msgID) tgBot.sendMessage(-4763690917, msg)
                    .then(message => {
                        currentBot.msgID = message.message_id;
                    })
                else tgBot.editMessageText(msg, {
                    chat_id: -4763690917,
                    message_id: currentBot.msgID
                })
                return
            }
            tgBot.sendMessage(-4763690917, message);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            tgBot.sendMessage(-4763690917, `@sasha_pshonko\n${bot.username} вырубился`);
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            } else {
                resolve(`${bot.type} bot finished successfully`);
            }
        });
    });
}

// Функция для остановки всех воркеров
function stopWorkers() {
    return new Promise((resolve, reject) => {
        try {
            workers.forEach(worker => worker.terminate()); // Завершаем все воркеры
            workers = []; // Очищаем массив воркеров
            resolve('All workers stopped');
        } catch (error) {
            reject('Error stopping workers: ' + error);
        }
    });
}

// Функция для выполнения git pull
function gitPull() {
    return new Promise((resolve, reject) => {
        exec('git pull', (err, stdout, stderr) => {
            if (err) {
                reject(`Error executing git pull: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
}

// Функция для перезапуска ботов
async function restartBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}

async function startBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}



// Обработка команд Telegram
tgBot.onText(/\/update/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        await stopWorkers(); // Останавливаем воркеров
        
        const pullResult = await gitPull(); // Выполняем git pull
        tgBot.sendMessage(chatId, `Git pull выполнен:\n${pullResult}`);

        tgBot.sendMessage(chatId, 'Перезапуск ботов...');
        await restartBots(); // Перезапускаем ботов
    } catch (error) {
        tgBot.sendMessage(chatId, `Произошла ошибка: ${error.message}`);
    }
});

startBots(); // Изначальный запуск ботов