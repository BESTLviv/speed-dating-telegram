const config = require('./config.json')
const Telegraf = require('telegraf')
const TelegrafInlineMenu = require('telegraf-inline-menu')
const bot = new Telegraf(config.bot_token)
bot.command(

var round_participants = {}

const menu = new TelegrafInlineMenu(ctx => "Привіт! Розпочнемо раунд speed-dating'у? \nРеєстрація триватиме 2 хвилини (120 сек)")
menu.setCommand('start')

menu.simpleButton('Прийняти участь', 'a', {
  doFunc: function(ctx){ ctx.reply(`${ctx.from.first_name} долучається до раунду!`) }
})

function start_round(argument) {
	// body...
}



bot.use(menu.init())

bot.startPolling()