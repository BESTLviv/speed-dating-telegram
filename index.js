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
	return telegram.getChatAdministrators(chatid)
	.then((admin_arr) => admin_arr.some(admin => parseInt(admin.user.id) === parseInt(userid)))
	.catch(()=> {
		return false
	})
	
}

function generate_pairs(ctx, members = []) {
	ctx.reply("Генеруємо пари...")
    if(members.length%2!==0||members.length===0){
		return
    }
	const copy = [...members]
	
    const sortedMembers = members.sort(
        (a, b) => {
            let a1 = old_pairs[a] && old_pairs[a].filter(value => members.includes(value)).length || 0
            let b1 = old_pairs[b] && old_pairs[b].filter(value => members.includes(value)).length || 0
            return a1 - b1
        })

    let meetBeforeUsers = []
    //for pairs that didn`t meet
    while (sortedMembers.length > 0) {
		console.log(sortedMembers)
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
console.log(copy)
console.log(meetBeforeUsers)
    if (copy.length === meetBeforeUsers.length) {
        ctx.reply(`Неможливо згенерувати нові унікальні пари =(`)
        return;
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
        .then(res => {
			console.log(res)
			setTimeout(() => {
				rnd_ovr_msg = 'Раунд завершився! Повертайся у конфу :)'
				telegram.sendMessage(user1, rnd_ovr_msg)
				telegram.sendMessage(user2, rnd_ovr_msg)
			}, 30000)
		})
        .catch(e=>console.log(e))
}
// Bot commands
bot.command('start', (ctx) => {
    ctx.reply("Привіт! Я - бот для Speed Dating'у.\nТи активував(-ла) мене, тож тепер можеш брати участь у раундах")
})

bot.command('speed_dating', (ctx) => {
	check_chat_admin(ctx.from.id, ctx.chat.id)
	.then(res => {
		if (res) {
			ctx.reply("Розпочнемо раунд speed-dating'у? \nРеєстрація триватиме 2 хвилини (120 сек)")
			ctx.reply("Обов'язково запусти мене в ПП перед реєстрацією!\nЩоб зареєструватись, напиши у цій конфі '/go' ")
			game_status = true
			reg_status = true
			setTimeout(() => {

				if (participants.length % 2 == 0) {
					ctx.reply("Реєстрація завершена!")
					reg_status = false
					generate_pairs(ctx, participants)
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
			}, 30000)
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
			game_status = false
			reg_status = false
			participants = []
		}
		else{
			ctx.reply("Упс... Лише адмін групи може зупиняти раунд!")
		}
	})
})

bot.command('reset_old_pairs', (ctx) => {
	check_chat_admin(ctx.from.id, ctx.chat.id)
	.then(res => {
		if (res) {
			old_pairs = {}
			ctx.reply("Історія пар очищена!")
		}
		else {
			ctx.reply("Упс... Лише адмін групи може це робити!")
		}
	})
})

bot.command('go', (ctx) => {
	if (game_status && reg_status) {
		if (!(participants.includes(ctx.from.id)) ) {
		  	telegram.sendMessage(ctx.from.id, 'Ти зареєструвався(-лась) на раунд speed-dating!').then(
		  		function(success) {
		  			ctx.reply(`У нас новий учасник!`)
		  			// participants = [48370546, 48370545, 48370544]
		  			participants[participants.length] = ctx.from.id
		  			console.log('OUR PAX:')
		  			console.log(participants)
		  			if (extend_reg) {
						ctx.reply(`Стартуємо!`)
		  				extend_reg = false
		  				generate_pairs(ctx, participants)
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