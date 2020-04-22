// Constants
const Telegraf = require('telegraf')
const TelegrafInlineMenu = require('telegraf-inline-menu')
const Telegram = require('telegraf/telegram')
const config = require('./config.json')
const bot = new Telegraf(config.bot_token)
const telegram = new Telegram(config.bot_token)
const jitsiUrl = 'https://meet.jit.si/'

// Process Variables
var game_status = false
var reg_status = false
var extend_reg = false
var participants = []
let old_pairs = {}
// Functions
function check_chat_admin(userid, chatid) {
	telegram.getChatAdministrators(chatid)
	.then((admin_arr) => {
		console.log(admin_arr.length)
		admin_arr.forEach(admin => {
			console.log('checking')
			console.log(admin)
			if (parseInt(admin.user.id) = parseInt(userid)) {
				return true
			}
		})
	} )
	.catch ( ()=>{
		return false
	})
	
}

function generate_pairs(members = []) {
    if(members%2!==0){
        return
    }
    const sortedMembers = members.sort(
        (a, b) => {
            let a1 = old_pairs[a] && old_pairs[a].filter(value => members.includes(value)).length || 0
            let b1 = old_pairs[b] && old_pairs[b].filter(value => members.includes(value)).length || 0
            return a1 - b1
        })

    let meetBeforeUsers = []

    //for pairs that didn`t meet
    while (sortedMembers.length > 0) {
	    let user1 = sortedMembers.pop()
        let filteredMembers = sortedMembers.filter(user => !old_pairs[user1] || !old_pairs[user1].includes(user))
        if (filteredMembers.length!==0) {
            let rand_i = Math.floor(Math.random() * filteredMembers.length)
            let itemToDelete = sortedMembers.findIndex(it=>it===filteredMembers[rand_i])
            let user2 = sortedMembers.splice(itemToDelete, 1)[0]
            if (!old_pairs[user1]) {
                old_pairs[user1] = []
            }
            if (!old_pairs[user2]) {
                old_pairs[user2] = []
            }
            old_pairs[user1].push(user2)
            old_pairs[user2].push(user1)
            send_jitsi_room(user1, user2)
        } else {
            meetBeforeUsers.push(user1)
        }
    }

    //for pairs that already meet
    while (meetBeforeUsers.length > 0) {
        let user1 = meetBeforeUsers.pop()
        let rand_i = Math.floor(Math.random() * meetBeforeUsers.length)
        let user2 = meetBeforeUsers.splice(rand_i, 1)[0]
        if(!old_pairs[user1].includes(user2)){
            old_pairs[user1].push(user2)
        }
        if(!old_pairs[user2].includes(user1)){
            old_pairs[user2].push(user1)
        }
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
	check_chat_admin(ctx.from.id, ctx.chat.id)
	.then(res => {
		if (res) {
			ctx.reply("Розпочнемо раунд speed-dating'у? \nРеєстрація триватиме 2 хвилини (120 сек)")
			ctx.reply("Обов'язково Напиши мені в ПП перед реєстрацією!\nЩоб зареєструватись, напиши у цій конфі '/go' ")
			game_status = true
			reg_status = true
			setTimeout(() => {

				if (participants.length % 2 == 0) {
					ctx.reply("Реєстрація завершена! Генеруємо пари...")
					console.log(participants.length)
					reg_status = false
					generate_pairs(participants)

				} else {
					if (participants.length >= 3) {
						ctx.reply("Реєстрація завершується... останній слот!")
						extend_reg = true
					} else {
						ctx.reply("Раунд не розпочато - Недостатньо учасників :(")
						game_status = false
						reg_status = false
						participants = []
						old_pairs = {}
					}
				}
			}, 25000)
		} else {
			ctx.reply("Упс... Лише адмін групи може стартувати раунд!")
		}
	})
	
})

bot.command('stop_dating', (ctx) => {
	check_chat_admin(ctx.from.id, ctx.chat.id)
	.then(res => {
		if (res) {
			ctx.reply("Раунд speed-dating'у завершений!")
			console.log('PAIRS')
			console.log(old_pairs)
			game_status = false
			reg_status = false
			participants = []
			old_pairs = {}
		}
		else{
			ctx.reply("Упс... Лише адмін групи може зупиняти раунд!")
		}
	})
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

// Launch
bot.startPolling()