// Constants
const Telegraf = require('telegraf')
const TelegrafInlineMenu = require('telegraf-inline-menu')
const Telegram = require('telegraf/telegram')
const config = require('./config.json')
const bot = new Telegraf(config.bot_token)
const telegram = new Telegram(config.bot_token)
const admin = config.adminID
const jitsiUrl = 'https://meet.jit.si/'

// Process Variables
var game_status = false
var reg_status = false
var extend_reg = false
var participants = []
var pairs_done = []

// Functions
function checkAdmin() {

}

function generate_pairs(members = []) {
	while (members.length>0) {
		console.log(members)
		let user1 = members[0]
		members.splice(0, 1);
		let rand_i = Math.floor(Math.random() * members.length)
		let user2 = members[rand_i]
		members.splice(rand_i, 1)
		pairs_done.push([user1, user2])
		send_jitsi_room(user1, user2)
	}
	
}

function send_jitsi_room (user1='', user2='') {
    if(!user1 || !user2){
        return
    }
    const personalRoomUrl = jitsiUrl + user1 + user2
    const message = "Твоє персональне посилання на мітинг " + personalRoomUrl
    Promise.all([telegram.sendMessage(user1, message), telegram.sendMessage(user2, message)])
        .then(res=>console.log(res))
        .catch(e=>console.log(e))
}
// send_jitsi_room(48370547,365306009)
// generate_pairs([48370547, 48370546, 365306009, 48370544])
// Bot commands
bot.command('start', (ctx) => {
	ctx.reply("Привіт! Я - бот для Speed Dating'у.\nТи активував(-ла) мене, тож тепер можеш брати участь у раундах")
})

bot.command('speed_dating', (ctx) => {
	ctx.reply("Розпочнемо раунд speed-dating'у? \nРеєстрація триватиме 2 хвилини (120 сек)")
	ctx.reply("Обов'язково запусти мене перед реєстрацією!\nЩоб зареєструватись, напиши /go")
	game_status = true
	reg_status = true
	setTimeout(()=>{
		
		if (participants.length % 2 == 0) {
			ctx.reply("Реєстрація завершена! Генеруємо пари...")
			console.log(participants.length)
			reg_status = false
			generate_pairs(participants)

		} else {
			if(participants.length>=3) {
				ctx.reply("Реєстрація завершується... останній слот!")
				extend_reg = true
			}
			else {
				ctx.reply("Раунд не розпочато - Недостатньо учасників :(")
				game_status = false
				reg_status = false
				participants = []
				pairs_done = []
			}
		}
	}, 25000)


})

bot.command('stop_dating', (ctx) => {
	ctx.reply("Раунд speed-dating'у завершений!")
	console.log('PAIRS')
	console.log(pairs_done)
	game_status = false
	reg_status = false
	participants = []
	pairs_done = []
})

bot.command('go', (ctx) => {
	if (game_status && reg_status) {
		if (!(participants.includes(ctx.from.id)) ) {
			console.log(ctx.from)
		  	telegram.sendMessage(ctx.from.id, 'Ти зареєструвався(-лась) на раунд speed-dating!').then(
		  		function(success) {
		  			ctx.reply(`У нас новий учасник!`)
		  			// participants = [48370546, 48370545, 48370544]
		  			participants[participants.length] = ctx.from.id
		  			
		  			console.log(participants)
		  			if (extend_reg) {
		  				extend_reg = false
		  				generate_pairs(participants)
		  			}
		  		},
		  		function(error) {
		  			ctx.reply(`@${ctx.from.username}: Активуй мене через повідомлення і спробуй ще раз! Реєстрація не вдалась!`)
				}
			)
		}
		else{
			telegram.sendMessage(ctx.from.id, 'Ти вже зареєстрований(-а) на цей раунд speed-dating!')
		}  	
	} else {
		ctx.reply(`@${ctx.from.username}: - реєстрація на speed dating наразі не активна`)
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