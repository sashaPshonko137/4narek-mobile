import fs from 'fs/promises';
import mineflayer from 'mineflayer';
import inventoryViewer from 'mineflayer-web-inventory';
import { createLogger, transports, format } from 'winston';
import { workerData, parentPort } from 'worker_threads';
import { loader as autoEat } from 'mineflayer-auto-eat'


const minDelay = 500;
const AHDelay = 2000;
const loadingDelay = 100;

const chooseBuying = 'Выбор скупки ресурсов';
const setSectionFarmer = 'Установка секции "фермер"';
const sectionFarmer = 'Секция "фермер"';
const setSectionFood = 'Установка секции "еда"';
const sectionFood = 'Секция "еда"';
const setSectionResources = 'Установка секции "ценные ресурсы"';
const sectionResources = 'Секция "ценные ресурсы"';
const setSectionLoot = 'Установка секции "добыча"';
const sectionLoot = 'Секция "добыча"';
const analysisAH = 'Анализ аукциона';
const buy = 'Покупка';
const myItems = 'Хранилище';
const setAH = 'Установка аукциона';

const slotToChooseBuying = 13;
const slotToSetSectionFarmer = 13;
const slotToLeaveSection = 3;
const slotToSetSectionFood = 21;
const slotToSetSectionResources = 23;
const slotToSetSectionLoot = 31;
const slotToTuneAH = 52;
const slotToReloadAH = 49;
const slotToTryBuying = 0;

const ahCommand = '/ah search netherite sword';

const itemPrices = [    {
    "name": "netherite_sword",
    "effects": [
        {
            "name": "minecraft:unbreaking",
            "lvl": 4
        },
        {
            "name": "minecraft:sharpness",
            "lvl": 5
        },
        {
            "name": "minecraft:fire_aspect",
            "lvl": 1
        },
        {
            "name": "minecraft:mending",
            "lvl": 1
        },
    ],
    "priceBuy": 3300000,
}]

const priceSell = 4000000

const minBalance = 100000000

const leftMouseButton = 0;
const noShift = 0;
const firstInventorySlot = 9;
const lastInventorySlot = 44;
const firstAHSlot = 0;
const lastAHSlot = 44;
const firstSellSlot = 36;

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        new transports.Console()
    ]
});


async function launchBookBuyer(name, password, anarchy, inventoryPort) {
    const bot = mineflayer.createBot({
        host: 'mc.funtime.su',
        port: 25565,
        username: name,
        password: password,
        version: '1.16.5',
    });



    const loginCommand = `/l ${name}`;
    const anarchyCommand = `/an${anarchy}`;
    const shopCommand = '/shop';

    console.warn = () => {};

    bot.once('spawn', async () => {
        const msg = `${bot.username} запущен!` 
        parentPort.postMessage(msg);
        bot.loadPlugin(autoEat)
        bot.mu = false;
        bot.startTime = Date.now() - 240000;
        bot.ahFull = false;
        bot.timeReset = Date.now() - 60000;
        bot.login = true;
        bot.timeActive = Date.now();
        bot.inventoryFull = false;
        bot.timeLogin = Date.now()
        bot.prices = []
        bot.count = 0
        bot.netakbistro = true
        
        logger.info(`${name} успешно проник на сервер.`);
        await delay(minDelay);
        bot.chat(loginCommand);

        await delay(minDelay);
        bot.chat(anarchyCommand);

        await delay(minDelay);
        bot.chat(shopCommand);
    });

    bot.on('physicsTick', async () => {
        if (Date.now() - bot.timeActive > 90000) {
            bot.timeActive = Date.now();
            bot.menu = analysisAH
            bot.mu = false;
            await safeAH(bot);
        }
    })

    bot.menu = chooseBuying;

    let slotToBuy = undefined;

    bot.startTime = Date.now() - 240000;


    bot.on('windowOpen', async () => {
        switch (bot.menu) {
            case chooseBuying:
                                const msg = {name: 'success', username: bot.username};
                parentPort.postMessage(msg);
                await delay(3000);
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionFarmer;

                await safeClick(bot, slotToChooseBuying, minDelay);

                break;

            case setSectionFarmer:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionFarmer;

                await safeClick(bot, slotToSetSectionFarmer, minDelay);

                break;

            case sectionFarmer:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionFood;

                await safeClick(bot, slotToLeaveSection, minDelay);

                break;

            case setSectionFood:
                
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionFood;

                await safeClick(bot, slotToSetSectionFood, minDelay);

                break;

            case sectionFood:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionResources;

                await safeClick(bot, slotToLeaveSection, minDelay);

                break;

            case setSectionResources:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionResources;

                await delay(getRandomDelayInRange(1000, 2500));


                await safeClick(bot, slotToSetSectionResources, minDelay);

                break;

            case sectionResources:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionLoot;

                await delay(getRandomDelayInRange(1000, 2500));


                await safeClick(bot, slotToLeaveSection, minDelay);

                break;

            case setSectionLoot:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionLoot;

                await delay(getRandomDelayInRange(1000, 2500));

                await safeClick(bot, slotToSetSectionLoot, minDelay);

                break;

            case sectionLoot:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = analysisAH;
                await delay(5000);
                bot.closeWindow(bot.currentWindow);
                await delay(500);

                while (Date.now() - bot.timeLogin < 13000) {
                    await delay(1000)
                }
                await safeAH(bot);

                break;

                case analysisAH:
                    bot.timeActive = Date.now();
                    generateRandomKey(bot);
                    const resetime = Math.floor((Date.now() - bot.timeReset) / 1000)
                    if (resetime > 60) {
                        logger.info(`${name} - ресет`);
                        await delay(500);
                        bot.menu = myItems;
                        await safeClick(bot, 46, getRandomDelayInRange(700, 1300))
    
                        break;
                    }
                    const uptime = Math.floor((Date.now() - bot.startTime) / 1000);  // Время в секундах
                    if (uptime > 240) {
                        logger.info(`${name} - продажа`);
                        await sellItems(bot)
    
                        break;
                    }
    
                    logger.info(`${name} - ${bot.menu}`);
                    await delay(1000);
    
                    switch (bot.inventoryFull) {
                        case true:
                            if (bot.ahFull) {
                                await longWalk(bot);
                                return
                            }
                            logger.error('Инвентарь заполнен')
                            await sellItems(bot)
                        
                            break;
    
                        case false:
                            logger.info(`${name} - поиск лучшего предмета`);
                            slotToBuy = await getBestAHSlot(bot, itemPrices);
    
                            switch (slotToBuy) {
                                case undefined:
                                    logger.info('не найден')
                                    bot.menu = analysisAH;
                                    await safeClick(bot, slotToReloadAH, getRandomDelayInRange(1000, 2000));
    
                                    break;
                                default:
                                    if (bot.netakbistro) {
                                        bot.netakbistro = false;
                                        await delay(getRandomDelayInRange(1100, 1100));
                                        await safeClickBuy(bot, slotToBuy, 0);
                                    } else if (slotToBuy < 18) {
                                        await delay(getRandomDelayInRange(100, 150));
                                        await safeClickBuy(bot, slotToBuy, 0);
                                    } else {
                                        await safeClick(bot, slotToReloadAH, getRandomDelayInRange(1000, 2000));
                                    }
                                    

    
                                    break;
                            }
                    }
    
                    break;
    
                    case buy:
                        bot.timeActive = Date.now();
                        logger.info(`${name} - ${bot.menu}`);
                      
                        bot.menu = analysisAH
                        await safeClick(bot, Math.floor(Math.random() * 3), getRandomDelayInRange(400, 500))
        
                        break;

            case myItems:
                logger.info(`${name} - ${bot.menu}`);
                bot.count = 0
                for (let i = 0; i < 3; i++) {
                    if (bot.currentWindow?.slots[i]) bot.count++
                }
                bot.menu = setAH;
                bot.timeReset = Date.now()

                await safeClick(bot, 52, getRandomDelayInRange(700, 1300))

                break;

            case setAH:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = analysisAH;

                await safeClick(bot, 46, getRandomDelayInRange(700, 1300))

                break;
        }
    });

    // bot.on('kicked', () => {
    //     logger.error(`${name} спалился!`);
    // });


    bot.on('message', async (message) => {
        const messageText = message.toString();
        console.log(messageText)

        if (messageText.includes('сервер заполнен')) {
            bot.mu = false
            bot.startTime = Date.now() - 240000;
            bot.ahFull = false;
            bot.timeReset = Date.now() - 60000;
            bot.login = true;
            bot.timeActive = Date.now();
            bot.inventoryFull = false;
            bot.timeLogin = Date.now()
            bot.prices = []
            bot.count = 0
            bot.netakbistro = true

            await delay(minDelay);
            bot.chat(anarchyCommand);
        }

        if (messageText.includes('[☃] Вы успешно купили') && !bot.ahFull) {
            await sellItems(bot)
            return
        }

        if (messageText.includes('[☃] У Вас купили')) {
            bot.ahFull = false;
            bot.count--
            await sellItems(bot)
            return
        }
        if (messageText.includes('выставлен на продажу!')) {
            bot.inventoryFull = false
            bot.count++
            return
        }
        if (messageText.includes('Не так быстро..')) {
            await delay(getRandomDelayInRange(500, 700));
            if (bot.currentWindow) {
                bot.closeWindow(bot.currentWindow);
            }
            await delay(getRandomDelayInRange(500, 700));
            bot.menu = analysisAH;
            await safeAH(bot);
            return
        }
        if (messageText.includes('[☃] Освободите хранилище или уберите предметы с продажи')) {
            bot.ahFull = true;
            return
        }

        if (messageText.includes('Добро пожаловать на FunTime.su') && bot.login) {
            logger.info(`${name} - зашел на сервер`);
            await delay(5000);
            bot.timeLogin = Date.now()
            bot.chat(anarchyCommand)

            bot.ahFull = false;
            bot.mu = true;
            bot.menu = chooseBuying;

            await delay(1000);
            bot.chat(shopCommand)
            return
        }

        if (messageText.includes('[☃] У Вас полный инвентарь и Хранилище!')) {
            bot.inventoryFull = true;
            return
        }

        if (messageText.includes('выставлен на продажу!')) {
            bot.inventoryFull = false
            return
        }

        if (messageText.includes('[$] Ваш баланс:')) {
            let balanceStr = messageText
            if (messageText.includes('.')) {
                balanceStr = balanceStr.slice(0, -3)
            }
            balanceStr = balanceStr.replace(/\D/g, '')
            const balance = parseInt(balanceStr);
            let count = 0
            for (let i = firstInventorySlot; i <= lastInventorySlot; i++) {
                if (bot.inventory.slots[i] && bot.inventory.slots[i].name === 'netherite_sword') count++
            }

            if (isNaN(balance)) {
                logger.error('баланс NAN')
                return
            }
            if (balance - minBalance >= 10000000) {
                const msg = {name: 'balance', username: bot.username, balance: balance - minBalance, count: count};
                parentPort.postMessage(msg);
                await delay(500)
                bot.chat(`/clan invest ${balance - minBalance}`)
            } else {
                const msg = {name: 'balance', username: bot.username, balance: 0, count: count};
                parentPort.postMessage(msg);
            }
            return
        }
    })


    // bot.on('end', () => {
    //     logger.error(`${name} спалился!`);
    // })
}
async function sellItems(bot) {
    const itemPrice = itemPrices[0];
    
    // Если уже в процессе продажи, ждём завершения
    if (bot.mu) {
        await delay(500);
        await safeAH(bot);
        return;
    }
    
    bot.mu = true;
    let saleSuccess = false;

    try {
        // Ждём после логина
        while (Date.now() - bot.timeLogin < 13000) await delay(1000);
        bot.timeActive = Date.now();

        if (bot.currentWindow) {
            bot.closeWindow(bot.currentWindow);
        }

        if (!bot.ahFull) {
            // 1. Сначала проверяем и выбрасываем неподходящие предметы
            for (let i = 0; i < lastInventorySlot; i++) {
                const slot = bot.inventory.slots[i];
                if (!slot || slot.name !== 'netherite_sword') continue;
                
                const enchantments = slot.nbt?.value?.Enchantments?.value?.value || [];
                const itemEnchants = enchantments.map(enchant => ({
                    name: enchant.id?.value,
                    lvl: enchant.lvl?.value
                }));

                const missingEnchants = itemPrice.effects?.filter(required => 
                    !itemEnchants.some(actual => 
                        actual.name === required.name && actual.lvl >= required.lvl
                    )
                ) || [];

                if (missingEnchants.length > 0) {
                    await delay(500);
                    await bot.tossStack(slot);
                }
            }

            // 2. Затем продаём подходящие предметы
            for (let i = 0; i < 9; i++) {
                if (bot.ahFull) break;
                
                const slotIndex = firstSellSlot + i;
                if (bot.inventory.slots[slotIndex]?.name === 'netherite_sword') {
                    if (bot.quickBarSlot !== i) {
                        await bot.setQuickBarSlot(i);
                        await delay(getRandomDelayInRange(500, 700));
                    }
                    bot.chat(`/ah sell ${priceSell}`);
                    await delay(getRandomDelayInRange(500, 700));
                    continue;
                }

                // Если в быстрой панели нет меча, ищем в инвентаре
                for (let j = 0; j < 27; j++) {
                    if (bot.ahFull) break;
                    
                    if (bot.inventory.slots[j]?.name === 'netherite_sword') {
                        await bot.setQuickBarSlot(0);
                        await delay(500);
                        await bot.moveSlotItem(j, 0);
                        await delay(getRandomDelayInRange(500, 700));
                        bot.chat(`/ah sell ${priceSell}`);
                        await delay(getRandomDelayInRange(500, 700));
                        break;
                    }
                }
            }
            saleSuccess = true;
        }
    } catch (error) {
        logger.error(`Ошибка в sellItems: ${error}`);
    } finally {
        // Действия после попытки продажи
        logger.info(`${bot.username} - прогулка`);
        await delay(500);
        bot.chat('/balance');
        await delay(500);
        await walk(bot);
        logger.info(`${bot.username} - прогулка закончена`);
        
        bot.startTime = Date.now();
        bot.mu = false;
        logger.info(`${bot.username} - мьютекс снят`);
        
        await delay(1000);
        bot.menu = analysisAH;
        await safeAH(bot);
    }
}


function generateRandomKey(bot) {
    bot.key = Math.random().toString(36).substring(2, 15);
}

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function safeClick(bot, slot, time) {
    await delay(time);

    if (bot.currentWindow) {
        bot.timeActive = Date.now();
        await bot.clickWindow(slot, leftMouseButton, noShift);
    }
}

async function safeAH(bot) {
    if (bot.mu) return
    bot.netakbistro = true
    let key = bot.key;
    bot.timeActive = Date.now();
    bot.menu = analysisAH
    while (key === bot.key) {
        bot.chat(ahCommand);
        await delay(1000);
    }
}

function inventoryFull(bot) {
    for (let i = firstInventorySlot; i <= lastInventorySlot; i++) {
        const slot = bot.inventory.slots[i];
        if (!slot) {
            return false;
        }
    }

    return true;
}

async function getBestAHSlot(bot, itemPrices) {
    if (!bot.currentWindow?.slots) {
        return undefined;
    }

    const itemPrice = itemPrices[0]; // Предполагаем, что массив всегда содержит только один предмет

    for (let i = firstAHSlot; i <= lastAHSlot; i++) {
        const slotData = bot.currentWindow.slots[i];
        if (!slotData) continue;

        const name = slotData.name;
        if (itemPrice.name !== name) continue;

        let durabilityLeft = 0;
        if (slotData.maxDurability) {
            const damage = slotData.nbt?.value?.Damage?.value || 0;
            durabilityLeft = slotData.maxDurability - damage;
            if (durabilityLeft < slotData.maxDurability * 0.6) continue;
        } else {
            continue;
        }

        try {
            const price = await getBuyPrice(slotData);
            if (!price) continue;

            let countItems = 0
            for (let sellSlot = firstSellSlot; sellSlot <= lastInventorySlot; sellSlot++) {
                const item = bot.inventory.slots[sellSlot];
                if (item && item?.name === 'netherite_sword') countItems++
            }
            let bestPrice = 0
            if (bot.count + countItems < 4) {
                bestPrice = priceSell-200000
            } else if (countItems < 11 || bot.prices.length === 0) {
                bestPrice = itemPrice.priceBuy
            } else {
                let sortedPrices = [...bot.prices].sort((a, b) => a - b);

const length = sortedPrices.length;

// Если массив не пустой
if (length > 0) {
    // Индекс, который находится на 25% от длины массива
    const index = Math.floor(length * 0.25);

    // Получаем цену, соответствующую этому индексу
    bestPrice = sortedPrices[index];
}

              }

            if (price > bestPrice) continue;

            // Проверка на зачарования после проверки цены
            const enchantments = slotData.nbt?.value?.Enchantments?.value?.value || [];
            const itemEnchants = enchantments.map(enchant => ({
                name: enchant.id?.value,
                lvl: enchant.lvl?.value
            }));

            const missingEnchants = itemPrice.effects?.filter(required => 
                !itemEnchants.some(actual => 
                    actual.name === required.name && actual.lvl >= required.lvl
                )
            ) || [];

            if (missingEnchants.length > 0) continue;

            if (countItems < 11 && bot.count + countItems > 3) {
                if (bot.prices.length < 20) {
                    bot.prices.push(price);
                  } else {
                    // Если массив полон, удаляем первый элемент и добавляем новый в конец
                    bot.prices.shift(); // Убираем первый элемент
                    bot.prices.push(price); // Добавляем новый элемент в конец
                  }
            }

            return slotData.slot;
        } catch (error) {
            continue;
        }
    }

    return undefined;
}




async function getBuyPrice(slotData) {
    const loreArray = slotData.nbt?.value?.display?.value?.Lore?.value?.value;
    if (!loreArray) return undefined;
    
    for (const jsonString of loreArray) {
        const parsedData = JSON.parse(jsonString);
        
        // Проверяем есть ли extra массив
        if (!parsedData.extra) continue;
        
        // Проверяем каждый элемент в extra
        for (const element of parsedData.extra) {
            if (element.text && element.text.startsWith(' $')) {
                const priceString = element.text.replace(/\D/g, '');
                const price = parseInt(priceString);
                if (!isNaN(price)) return price;
            }
        }
    }
    
    logger.error('Цена не найдена')
    fs.writeFileSync('error.json', JSON.stringify(slotData, null, 2));

    return undefined;
}

function getRandomDelayInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

if (workerData) {
    launchBookBuyer(workerData.username, workerData.password, workerData.anarchy, workerData.inventoryPort);
}


async function longWalk(bot) {
    bot.autoEat.enableAuto()
    bot.timeActive = Date.now();
    logger.info(`${bot.username} - все забито. Гуляем.`);
    while (bot.ahFull) {  // Гуляем пока ahFull === true
        const resetime = Math.floor((Date.now() - bot.timeReset) / 1000)
        if (resetime > 60) {
            await delay(500);
            ['forward', 'back', 'left', 'right'].forEach(move => 
                bot.setControlState(move, false)
            );
            await delay(500);
            await safeAH(bot);
            bot.autoEat.disableAuto()

            return
        }

        // Случайное движение
        const movements = ['forward', 'back', 'left', 'right'];
        const randomMove = movements[Math.floor(Math.random() * movements.length)];
        bot.setControlState(randomMove, true);
        await delay(500);
        bot.setControlState(randomMove, false);
        
        
        await delay(500);
    }

    logger.info(`${bot.username} - опять работать.`);

    // Останавливаем все движения когда ahFull стал false
    ['forward', 'back', 'left', 'right'].forEach(move => 
        bot.setControlState(move, false)
    );

    bot.autoEat.disableAuto()
}

async function walk(bot) {
    bot.autoEat.enableAuto()
    const endTime = Date.now() + 10000;

    while (Date.now() < endTime) {
        
        // Случайное движение
        const movements = ['forward', 'back', 'left', 'right'];
        const randomMove = movements[Math.floor(Math.random() * movements.length)];
        bot.setControlState(randomMove, true);
        await delay(500);
        bot.setControlState(randomMove, false);
        
        
        await delay(500);
    }
    
    // Останавливаем все движения
    ['forward', 'back', 'left', 'right'].forEach(move => 
        bot.setControlState(move, false)
    );

    bot.autoEat.disableAuto()

}

async function safeClickBuy(bot, slot, time) {
    await delay(time);

    if (bot.currentWindow) {
        bot.timeActive = Date.now();
        await bot.clickWindow(slot, leftMouseButton, 1);
    }
}