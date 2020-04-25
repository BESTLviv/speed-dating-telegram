const config = require('./config.json')
const Telegram = require('telegraf/telegram')
const telegram = new Telegram(config.bot_token)

const ROUND_DURATION = 60 * 10 * 1000
const jitsiUrl = 'https://meet.jit.si/'

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ old_pairs: {} }).write()

function generatePairs(members = []) {
    const pairs = []
    const copy = [...members]
    let old_pairs = db.get('old_pairs').value()

    const sortedMembers = members.sort((a, b) => {
        let a1 = (old_pairs[a] && old_pairs[a].filter((value) => members.includes(value)).length) || 0
        let b1 = (old_pairs[b] && old_pairs[b].filter((value) => members.includes(value)).length) || 0
        return a1 - b1
    })

    let meetBeforeUsers = []

    //for pairs that didn`t meet
    while (sortedMembers.length > 0) {
        let user1 = sortedMembers.pop()
        let filteredMembers = sortedMembers.filter((user) => !old_pairs[user1] || !old_pairs[user1].includes(user))
        if (filteredMembers.length !== 0) {
            let rand_i = Math.floor(Math.random() * filteredMembers.length)
            let itemToDelete = sortedMembers.findIndex((it) => it === filteredMembers[rand_i])
            let user2 = sortedMembers.splice(itemToDelete, 1)[0]
            if (!old_pairs[user1]) {
                db.set('old_pairs.' + user1, []).write()
            }
            if (!old_pairs[user2]) {
                db.set('old_pairs.' + user2, []).write()
            }
            db.get('old_pairs.' + user1)
                .push(user2)
                .write()
            db.get('old_pairs.' + user2)
                .push(user1)
                .write()
            pairs.push([user1, user2])
        } else {
            meetBeforeUsers.push(user1)
        }
    }

    if (copy.length === meetBeforeUsers.length) {
        throw new Error('not-unique')
    }

    old_pairs = db.get('old_pairs').value()
    //for pairs that already meet
    while (meetBeforeUsers.length > 0) {
        let user1 = meetBeforeUsers.pop()
        let rand_i = Math.floor(Math.random() * meetBeforeUsers.length)
        let user2 = meetBeforeUsers.splice(rand_i, 1)[0]
        if (!old_pairs[user1].includes(user2)) {
            db.get('old_pairs.' + user1)
                .push(user2)
                .write()
        }
        if (!old_pairs[user2].includes(user1)) {
            db.get('old_pairs.' + user2)
                .push(user1)
                .write()
        }
        pairs.push([user1, user2])
    }
    return pairs
}

function sendJitsiRoom(user1 = '', user2 = '') {
    if (!user1 || !user2) {
        return
    }
    const personalRoomUrl = jitsiUrl + user1 + user2
    const message = 'Твоє персональне посилання на мітинг ' + personalRoomUrl
    Promise.all([telegram.sendMessage(user1, message), telegram.sendMessage(user2, message)])
        .then((res) => {
            setTimeout(() => {
                Promise.all([
                    telegram.sendMessage(user1, 'Раунд завершився! Повертайся у конфу :)'),
                    telegram.sendMessage(user2, 'Раунд завершився! Повертайся у конфу :)'),
                ]).catch(console.log)
            }, ROUND_DURATION)
        })
        .catch(console.log)
}

function checkChatAdmin(userId, chatId) {
    return telegram
        .getChatAdministrators(chatId)
        .then((admin_arr) => admin_arr.some((admin) => admin.user && parseInt(admin.user.id) === parseInt(userId)))
        .catch(() => {
            return false
        })
}

function resetPairs() {
    db.set('old_pairs', {}).write()
}

module.exports = { checkChatAdmin, generatePairs, sendJitsiRoom, resetPairs }
