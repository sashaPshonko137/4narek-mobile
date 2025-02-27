const { Worker } = require('worker_threads');
const { join } = require('path'); // Импортируем join для работы с путями

// Массив с ботами
const bots = [
    { username: 'oxxxydenis', password: 'ggggg', anarchy: 605, type: 'elytra', inventoryPort: 3001 },
    // { username: 'big_jopan', password: 'ggggg', anarchy: 605, type: 'gold', inventoryPort: 3000 },
    { username: 'evtifron', password: 'ggggg', anarchy: 605, type: 'sword', inventoryPort: 3002 },
];

// Функция для запуска Worker'ов
function runWorker(bot) {
    return new Promise((resolve, reject) => {
        // Строим путь к скрипту для конкретного типа бота
        const workerScriptPath = join(__dirname, `${bot.type}.js`);

        // Запускаем worker с переданным типом и данными бота
        const worker = new Worker(workerScriptPath, {
            workerData: bot // Передаем данные бота в worker
        });

        worker.on('message', (message) => {
            console.log(`Worker message: ${message}`);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            } else {
                resolve(`${bot.type} bot finished successfully`);
            }
        });
    });
}

// Запускаем все Workers параллельно
async function startBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}

startBots();
