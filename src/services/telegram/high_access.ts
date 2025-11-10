import type { Types } from "mongoose";
import roles from "../../roles/UserRoles.js";
import { bot } from "./bot.js";
import type TelegramBot from "node-telegram-bot-api";
import { roles_map } from "../../roles/roles_map.js";

const reqMessage = process.env.TELEGRAM_ACCESS_REQUEST_MESSAGE
const ownerId = process.env.TELEGRAM_OWNER_ID

type UserRoleData = UserInfo & { _id: Types.ObjectId; }

function userTextInfo(userInfo: UserRoleData) {
    return `ID: ${userInfo.tg_id}\nІм'я: ${userInfo.fullname}\nДоступ: ${userInfo.role}\nUsername: ${userInfo.username || 'нема'}`
}

function allUsersTextInfo(usersInfo: UserRoleData[]) {
    return usersInfo.map(userInfo => userTextInfo(userInfo)).join('\n--------\n')
}

function userTextInfoFromMsg(message: TelegramBot.Message) {
    const from = message.from || message.chat
    let fullname = from.first_name

    if (from.last_name) {
        fullname += ' ' + from.last_name
    }
    return `${from.id}\n${fullname}\n${from.username || 'нема @username'}\n`
}

export async function handleGetAccessCommands(userId: string, message: TelegramBot.Message) {
    const textMessage = message.text
    if (textMessage && reqMessage === textMessage && ownerId) {
        if (userId === ownerId) {
            return;
        }

        bot.sendMessage(userId, 'Запит надісланий до власника бота')
        bot.sendMessage(ownerId, `${userTextInfoFromMsg(message)}\nЗапит доступу`, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Надати", callback_data: "preaccept" },
                        { text: "Відхилити", callback_data: "predecline" }
                    ]
                ]
            }
        })
        return
    }

    if (textMessage && userId === ownerId) {
        if (textMessage === 'список доступу') {
            bot.sendMessage(ownerId, allUsersTextInfo(Object.values(roles.getAllUsers())) || 'Список доступів порожній')
            return
        }

        if (textMessage === 'оновити доступи') {
            await roles.reload()
            bot.sendMessage(ownerId, 'Доступи оновлені')
            return
        }

        const deleteAccessMatch = textMessage.match(/^забрати доступ (\d+)$/)

        if (deleteAccessMatch) {
            const deleteForUserId = deleteAccessMatch[1]

            if (deleteForUserId) {
                const role = roles.getUserRole(deleteForUserId)

                if (!role) {
                    bot.sendMessage(userId, `Користувач ${deleteForUserId} немає жодного доступу`)
                    return
                }

                const userInfo = await roles.deleteUser(deleteForUserId)

                if (!userInfo) {
                    bot.sendMessage(userId, `Помилка на стороні додатку`)
                    return
                }

                const textInfo = userTextInfo(userInfo)

                await bot.sendMessage(userId, `${textInfo}\n\nТепер цей користувач немає жодного доступу`)
            }

            return;
        }

        const updateAccessMatch = textMessage.match(/^змінити доступ ([a-z]+) (\d+)$/)

        if (updateAccessMatch) {
            const newRole = updateAccessMatch[1]
            const updateForUserId = updateAccessMatch[2]

            if (updateForUserId) {
                const role = roles.getUserRole(updateForUserId)

                if (!role) {
                    bot.sendMessage(userId, `Користувач ${updateForUserId} немає жодного доступу`)
                    return
                }

                const userInfo = await roles.updateUserRole(updateForUserId, newRole)

                if (!userInfo) {
                    bot.sendMessage(userId, `Помилка на стороні додатку`)
                    return
                }

                const textInfo = userTextInfo(userInfo)

                await bot.sendMessage(userId, `${textInfo}\nТепер цей користувач має доступ ${newRole}`)
            }

            return
        }
    }
}

bot.on('callback_query', async (q) => {
    const userId = q.from.id.toString()

    if (userId !== ownerId) {
        return
    }

    const answer = q.data
    const qText = q.message?.text

    if (!qText || !answer) {
        return
    }

    if (answer === 'preaccept') {
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        { text: "Відхилити доступ", callback_data: "decline" }
                    ],
                    ...Object.keys(roles_map).map(role => ([
                        { text: role, callback_data: `accept__${role}` }
                    ]))
                ]
            },
            {
                chat_id: q.message?.chat.id,
                message_id: q.message?.message_id
            }
        )
    } else if (answer === 'predecline') {
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        { text: "Надати все таки", callback_data: "preaccept" },
                    ],
                    [
                        { text: "Відхилити точно доступ", callback_data: "decline" }
                    ]
                ]
            },
            {
                chat_id: q.message?.chat.id,
                message_id: q.message?.message_id
            }
        )
    } else if (answer === 'decline') {
        bot.editMessageText(qText + '\n\nВІДХИЛЕНО', {
            chat_id: q.message?.chat.id,
            message_id: q.message?.message_id,
            reply_markup: {
                inline_keyboard: []
            }
        })

        const declinedForId = qText.split('\n')[0]

        bot.sendMessage(declinedForId, 'Власник бота відмовив вам у доступі')
        return
    }

    const match = answer.match(/^accept__([a-z]+)$/)

    if (match) {
        const newRole = match[1]
        const [tg_id, fullname, un] = qText.split('\n')
        const username = un === 'нема @username' ? undefined : un

        const res = await roles.addUser({ tg_id, role: newRole, fullname, username })

        let newMessageText;

        if (res) {
            newMessageText = `${qText}\n\nДОСТУП ${newRole} НАДАНО`
        } else {
            newMessageText = `Схоже, користувач вже має певний доступ\nМожете змінити доступ за допомогою "змінити доступ ${Object.keys(roles_map).join('/')} ${tg_id}"`
        }

        bot.editMessageText(
            newMessageText,
            {
                chat_id: q.message?.chat.id,
                message_id: q.message?.message_id,
                reply_markup: {
                    inline_keyboard: []
                }
            }
        )
    }
})