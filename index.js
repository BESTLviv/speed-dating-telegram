const Telegraf = require('telegraf')
const Telegram = require('telegraf/telegram')
const config = require('./config.json')
const {
    generatePairs,
    sendJitsiRoom,
    checkChatAdmin,
    resetPairs,
    interruptRegistration,
    getTimers,
} = require('./helper.js')

const bot = new Telegraf(config.bot_token)
const telegram = new Telegram(config.bot_token)
const REGISTRATION_DURATION = config.registration_duration

const registerButtonMenu = Telegraf.Extra.markdown().markup((m) =>
    m.inlineKeyboard([m.callbackButton('Register ⭐', 'register')])
)

// Process Variables
let reg_status = false
let extend_reg = false
let markdownObj = {}
let participants = []
let registrationIntervalId
let registrationTimeoutId

bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        ctx.reply('Напиши /start мені в ПП, щоб мати можливість брати участь у раундах').catch(console.log)
    } else {
        ctx.reply(
            "Привіт! Я - бот для Speed Dating'у.\nТи активував(-ла) мене, тож тепер можеш брати участь у раундах"
        ).catch(console.log)
    }
})

bot.action('register', async (ctx) => {
    if (!reg_status) {
        return
    }

    if (participants.includes(ctx.from.id)) {
        telegram.sendMessage(ctx.from.id, 'Ти вже зареєстрований(-а) на цей раунд speed-dating!').catch(console.log)
        return
    }

    try {
        await telegram.sendMessage(ctx.from.id, 'Ти зареєструвався(-лась) на раунд speed-dating!')
        participants.push(ctx.from.id)
    } catch (e) {
        //TODO: To be improved
        const name = ctx.update.callback_query.from.username
            ? `@${ctx.update.callback_query.from.username}`
            : ctx.update.callback_query.from.first_name
            ? `@${ctx.update.callback_query.from.first_name}`
            : ''
        ctx.reply(`${name}: Напиши мені в ПП команду '/start' і спробуй ще раз! Реєстрація не вдалась!`).catch(
            console.log
        )
        return
    }

    if (extend_reg) {
        try {
            if (participants.length % 2 !== 0) {
                return
            }

            extend_reg = false
            await ctx.editMessageText(`Зареєстровано ${participants.length} учасників \nРеєстрацію завершено 😄`)
            await ctx.reply(`Генерую пари!`).catch(console.log)

            const pairs = generatePairs(participants)
            await Promise.all(pairs.map((pair) => sendJitsiRoom(...pair)))

            await ctx.reply(`Стартуємо!`).catch(console.log)
        } catch (e) {
            if (e.message === 'not-unique') {
                ctx.reply(`Неможливо згенерувати нові унікальні пари =(`).catch(console.log)
            }
            console.log(e)
        }
    } else {
        ctx.editMessageText('Зареєстровано: ' + participants.length, registerButtonMenu).catch(console.log)
    }
})

bot.command('speed_dating', async (ctx) => {
    try {
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            if (reg_status) {
                await ctx.reply('Неможливо створити новий раунд поки реєстрація на попередній не завершена')
                return
            }

            if (getTimers().length) {
                await ctx.reply(
                    'Неможливо створити новий раунд поки попередній не закінчився \nЩоб достроково завершити попередній раунд, скористайтесь командою /interrupt_round'
                )
                return
            }
            const replyObject = await ctx.reply(
                `Розпочнемо раунд speed-dating'у? \nРеєстрація завершиться через ${REGISTRATION_DURATION / 1000} сек`
            )
            await ctx.reply("Обов'язково запусти мене в ПП перед реєстрацією!")
            markdownObj = await ctx.replyWithMarkdown('Зареєстровано 0 учасників', registerButtonMenu)

            const date = Date.now()
            registrationIntervalId = setInterval(async function () {
                if (Math.round((REGISTRATION_DURATION - (Date.now() - date)) / 1000) <= 0) {
                    await telegram.editMessageText(
                        replyObject.chat.id,
                        replyObject.message_id,
                        null,
                        `Розпочнемо раунд speed-dating'у?`
                    )
                    clearInterval(registrationIntervalId)
                    return
                }
                await telegram.editMessageText(
                    replyObject.chat.id,
                    replyObject.message_id,
                    null,
                    `Розпочнемо раунд speed-dating'у? \nРеєстрація завершиться через ${Math.round(
                        (REGISTRATION_DURATION - (Date.now() - date)) / 1000
                    )} сек`
                )
            }, 5000)

            reg_status = true
            registrationTimeoutId = setTimeout(() => {
                endRegistrationHandler(ctx)
                registrationTimeoutId = null
            }, REGISTRATION_DURATION)
        } else {
            ctx.reply('Упс... Лише адмін групи може стартувати раунд!').catch(console.log)
        }
    } catch (e) {
        console.log(e)
    }
})

bot.command('stop_dating', async (ctx) => {
    try {
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            if (!reg_status) {
                await ctx.reply('Неможливо завершити реєстрацію, яка не почалась')
                return
            }
            reg_status = false
            extend_reg = false
            participants = []
            clearInterval(registrationIntervalId)
            clearTimeout(registrationTimeoutId)
            await ctx.reply('Реєстрацію перервано')
            await telegram.editMessageText(markdownObj.chat.id, markdownObj.message_id, null, 'Реєстрація закрита :(')
        } else {
            await ctx.reply('Упс... Лише адмін групи може зупиняти раунд!')
        }
    } catch (e) {
        console.log(e)
    }
})

bot.command('interrupt_round', async (ctx) => {
    try {
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            if (!getTimers().length) {
                await ctx.reply('Неможливо перервати раунд який не почався')
                return
            }
            interruptRegistration(ctx)
        } else {
            await ctx.reply('Упс... Лише адмін групи може перервати раунд!')
        }
    } catch (e) {
        console.log(e)
    }
})

bot.command('reset_old_pairs', async (ctx) => {
    try {
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            resetPairs()
            await ctx.reply('Історія пар очищена!')
        } else {
            await ctx.reply('Упс... Лише адмін групи може це робити!')
        }
    } catch (e) {
        console.log(e)
    }
})

bot.command('help', async (ctx) => {
    try {
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            await ctx.reply(`Список команд доступних для адміна:
🤖/speed_dating - стартує реєстрацію на новий раунд спід-дейтінга
🤖/stop_dating - відміняє реєстрацію
🤖/interrupt_round - перериває раунд спіддейтинга(всі хто брав участь в цьому раунді отримають повідомлення про те, що раунд завершено)
🤖/reset_old_pairs - видаляє історію пар які були колись зформовані (не викликайте, якщо не хочете, щоб пари повторялись)
            `)
        } else {
            await ctx.reply(
                'Упс... Лише адмін групи викликати команди! \nНапиши мені в ПП команду /start, якщо ще не зробив цього'
            )
        }
    } catch (e) {
        console.log(e)
    }
})

async function endRegistrationHandler(ctx) {
    if (!reg_status) {
        return
    }

    try {
        if (participants.length < 2) {
            ctx.reply('Раунд не розпочато - Недостатньо учасників :(')
            telegram.editMessageText(markdownObj.chat.id, markdownObj.message_id, null, 'Реєстрація закрита :(')

            reg_status = false
            participants = []
            return
        }

        if (participants.length % 2 !== 0) {
            ctx.reply('Реєстрація завершується... останній слот!')
            extend_reg = true
            return
        }

        reg_status = false
        await telegram.editMessageText(
            markdownObj.chat.id,
            markdownObj.message_id,
            null,
            `Зареєстровано ${participants.length} учасників \nРеєстрацію завершено 😄`
        )
        await ctx.reply(`Генерую пари!`)

        const pairs = generatePairs(participants)
        await Promise.all(pairs.map((pair) => sendJitsiRoom(...pair)))
        participants = []

        await ctx.reply(`Стартуємо!`)
    } catch (e) {
        if (e.message === 'not-unique') {
            extend_reg = false
            reg_status = false
            ctx.reply(`Неможливо згенерувати нові унікальні пари =(`).catch(console.log)
        }
        // old pairs bug!!!!
        console.log(e)
    }
}

// Launch
bot.startPolling()
