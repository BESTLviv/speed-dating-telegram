// Constants
const Telegraf = require('telegraf')
const TelegrafInlineMenu = require('telegraf-inline-menu')
const Telegram = require('telegraf/telegram')
const config = require('./config.json')
const bot = new Telegraf(config.bot_token)
const telegram = new Telegram(config.bot_token)

// Functions
function checkAdmin() {

}

function generate_pairs(members = []) {

}

function send_jitsi_room (user1='', user2='') {

}

// Bot commands
bot.command('start', (ctx) => {
	ctx.reply("Привіт! Я - бот для Speed Dating'у.\nТи активував(-ла) мене, тож тепер можеш брати участь у раундах")
})

var game_status = false
var reg_status = false
var participants = []

bot.command('speed_dating', (ctx) => {
	ctx.reply("Розпочнемо раунд speed-dating'у? \nРеєстрація триватиме 2 хвилини (120 сек)")
	ctx.reply("Обов'язково запусти мене перед реєстрацією!")
	ctx.reply("Щоб зареєструватись, напиши /go")
	game_status = true
	reg_status = true
})

bot.command('stop_dating', (ctx) => {
	ctx.reply("Раунд speed-dating'у завершений!")
	game_status = false
})

bot.command('go', (ctx) => {
	if (game_status && reg_status) {
	  	telegram.sendMessage(ctx.from.id, 'Ти зареєструвався(-лась) на раунд speed-dating!').then(
	  		function(success) {
	  			ctx.reply(`У нас новий учасник!`)
	  		},
	  		function(error) {
	  			ctx.reply(`@${ctx.from.username}: Активуй мене через повідомлення і спробуй ще раз! Реєстрація не вдалась!`)
			}
		)
	} else {
		ctx.reply(`@${ctx.from.username}: не квапся, козаче - реєстрація на speed dating ще не відкрита!`)
	}
})

// Other


const menu = new TelegrafInlineMenu(ctx => "Test")
menu.simpleButton('Test menu', 'a', {
  doFunc: function(ctx){
  	console.log(ctx.from)
  }
})

menu.setCommand('test')



bot.use(menu.init())

// Launch
bot.startPolling()