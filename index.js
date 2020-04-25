const Telegraf = require('telegraf')
const Telegram = require('telegraf/telegram')
const config = require('./config.json')
const { generatePairs, sendJitsiRoom, checkChatAdmin, resetPairs } = require('./helper.js')

const bot = new Telegraf(config.bot_token)
const telegram = new Telegram(config.bot_token)
const REGISTRATION_DURATION = 60 * 1000 // 2 * 60 * 1000

const testMenu = Telegraf.Extra.markdown().markup((m) =>
    m.inlineKeyboard([m.callbackButton('Register ⭐', 'register')])
)

// Process Variables
let reg_status = false
let extend_reg = false
let markdownObj = {}
let participants = []

bot.command('start', async (ctx) => {
    ctx.reply(
        "Привіт! Я - бот для Speed Dating'у.\nТи активував(-ла) мене, тож тепер можеш брати участь у раундах"
    ).catch(console.log)
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
        ctx.reply(`${name}: Активуй мене через повідомлення і спробуй ще раз! Реєстрація не вдалась!`).catch(
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
        ctx.editMessageText('Зареєстровано: ' + participants.length, testMenu).catch(console.log)
    }
})

bot.command('speed_dating', async (ctx) => {
    try {
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            await ctx.reply("Розпочнемо раунд speed-dating'у? \nРеєстрація триватиме 2 хвилини (120 сек)")
            await ctx.reply("Обов'язково запусти мене в ПП перед реєстрацією!")
            markdownObj = await ctx.replyWithMarkdown('Зареєстровано 0 учасників', testMenu)

            reg_status = true
            setTimeout(() => {
                endRegistrationHandler(ctx)
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
        if (!reg_status) {
            return
        }
        const isAdmin = await checkChatAdmin(ctx.from.id, ctx.chat.id)
        if (isAdmin) {
            reg_status = false
            participants = []
            await ctx.reply('Реєстрацію перервано')
            await telegram.editMessageText(markdownObj.chat.id, markdownObj.message_id, null, 'Реєстрація закрита :(')
        } else {
            await ctx.reply('Упс... Лише адмін групи може зупиняти раунд!')
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
            ctx.reply(`Неможливо згенерувати нові унікальні пари =(`).catch(console.log)
        }
        // old pairs bug!!!!
        console.log(e)
    }
}

// Launch
bot.startPolling()
