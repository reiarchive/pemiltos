//require("http").createServer((_, res) => res.end("Berjalan coy")).listen(8080)

const owner = ['6282265040091']
const { default: whatsappConnect, useSingleFileAuthState, downloadMediaMessage, DisconnectReason, fetchLatestBaileysVersion, MessageType, Mimetype, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto, getContentType } = require("@adiwajshing/baileys")
const { state, saveState } = useSingleFileAuthState('pemiltos2023')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const figlet = require('figlet')
const _ = require('lodash')
const crypto = require('crypto')
const path = require('path')
const moment = require('moment-timezone')
const config = require('./config/config.json');
const util = require('util');
const usersMap = new Map();

const { searchUser, addUser, searchNis } = require('./function/crud');


var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};


const { type } = require("os")
const { formatWithOptions } = require("util")

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

const color = (text, color) => {
    return !color ? chalk.green(text) : chalk.keyword(color)(text)
}

function smsg(conn, m, store) {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        if (m.quoted) {
            let type = getContentType(quoted)
			m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
				type = getContentType(m.quoted)
				m.quoted = m.quoted[type]
			}
            if (typeof m.quoted === 'string') m.quoted = {
				text: m.quoted
			}
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
			m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
			if (!m.quoted.id) return false
			let q = await store.loadMessage(m.chat, m.quoted.id, conn)
 			return exports.smsg(conn, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })

            /**
             * 
             * @returns 
             */
            m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key })

	   /**
		* 
		* @param {*} jid 
		* @param {*} forceForward 
		* @param {*} options 
		* @returns 
	   */
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options)

            /**
              *
              * @returns
            */
            m.quoted.download = () => conn.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    /**
	* Reply to this message
	* @param {String|Object} text 
	* @param {String|false} chatId 
	* @param {Object} options 
	*/
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options })
    /**
	* Copy this message
	*/
	m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)))

	/**
	 * 
	 * @param {*} jid 
	 * @param {*} forceForward 
	 * @param {*} options 
	 * @returns 
	 */
	m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)

    return m
}

function getDevice(id) {
    const deviceType = id.length > 21 ? 'android' : id.substring(0, 2) === '3A' ? 'ios' : 'web'
    return deviceType
}

function addMsgCount(userNumber, userMapData) {
    let msgCount = userMapData.msgCount
    ++msgCount;

    userMapData.msgCount = msgCount;

    usersMap.set(userNumber, userMapData);
    return true;

}

async function startServer() {
 
    console.log(color(figlet.textSync('Pemiltos', {
		font: 'Standard',
		horizontalLayout: 'default',
		vertivalLayout: 'default',
		whitespaceBreak: false
	}), 'green'))

    const client = whatsappConnect({
        browser: ['Pemiltos 2023','Safari','3.0'],
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
    })

    store.bind(client.ev)

    client.ev.on('messages.upsert', async chatUpdate => {
        try {
            
            let usersChat = chatUpdate.messages[0]
            
            
            
            if (!usersChat.message) return
            usersChat.message = (Object.keys(usersChat.message)[0] === 'ephemeralMessage') ? usersChat.message.ephemeralMessage.message : usersChat.message
            if (usersChat.key && usersChat.key.remoteJid === 'status@broadcast') return
            if (!client.public && !usersChat.key.fromMe && chatUpdate.type === 'notify') return
            if (usersChat.key.id.startsWith('BAE5') && usersChat.key.id.length === 16) return
            
            
            var device_type = getDevice(usersChat.key.id)

            var userNumber = ((usersChat.key.remoteJid).toString()).split("@")[0]

            m = smsg(client, usersChat, store)


            var typeMessage = getContentType(usersChat.message);


            const userSend = (typeMessage == "conversation" || typeMessage == "extendedTextMessage") ? m.body : ((typeMessage == "imageMessage") ? "Image" : ((typeMessage == "documentMessage") ? "Document" : ((typeMessage == "videoMessage") ? "Video" : ((typeMessage == "stickerMessage") ? "Sticker" : "Unknown"))))
            
            console.log(`[\x1b[1;32m ${config.name} \x1b[1;37m] ` + moment().tz('Asia/Jakarta').format("HH:mm:ss") + ' ' + chalk.green(userNumber) + ' ' + chalk.blue(usersChat.pushName) + ' SEND ' + chalk.blue(userSend))
            

            if(typeMessage == "conversation" || typeMessage == "extendedTextMessage") {
                var pesan = (m.body).toString();

    
                if(pesan.startsWith('/register ')) {
                    const nis = pesan.replace("/register ", "").trim();
                    
                    var userData = await searchNis(nis)

                    if(userData) {

                        console.log(userData);

                        const sections = [
                            {
                                title: "Konfirmasi disini",
                                rows: [
                                    {title: "Yes", rowId: "confirm_" + nis, description: "Data benar"},
                                    {title: "No", rowId: "reject_" + nis, description: "Data salah"}
                                ]
                            }
                        ]
                        
                        const listMessage = {
                            title: "Data diri",
                            text:   "Nama : " + userData['nama'] + "\n" +
                                    "NIS     : " + userData['nis'] + "\n\n" +
                                    "Klik tombol untuk konfirmasi identitas kamu!",
                            buttonText: "Klik disini!",
                            sections
                        }

                        client.sendMessage(usersChat.key.remoteJid, listMessage);
                    } else {
                        client.sendMessage(usersChat.key.remoteJid, { text: "nis kamu tidak terdaftar di database"});
                    }

                }
               
            } else if(typeMessage == "listResponseMessage") {

                const confirm_deny = usersChat.message.listResponseMessage.singleSelectReply.selectedRowId;

                if(confirm_deny.startsWith('confirm_')) {
                    // Insert di db kalo dia register
                    client.sendMessage(usersChat.key.remoteJid, { text : "Terkonfirmasi" });
                } else if(confirm_deny.startsWith('reject_')) {
                    client.sendMessage(usersChat.key.remoteJid, { text : "Silahkan register ulang" });
                } else {
                    client.sendMessage(usersChat.key.remoteJid, { text: "Error, silahkan hubungi MPK"});
                }
            }



            

            //require("./handleMessage")(client, m, chatUpdate, store)
        } catch (err) {
            console.log(err)
        }
        
    })
	
    // Handle error
    const unhandledRejections = new Map()
    process.on('unhandledRejection', (reason, promise) => {
        unhandledRejections.set(promise, reason)
        console.log('Unhandled Rejection at:', promise, 'reason:', reason)
    })
    process.on('rejectionHandled', (promise) => {
        unhandledRejections.delete(promise)
    })
    process.on('Something went wrong', function(err) {
        console.log('Caught exception: ', err)
    })
    
    // Setting
    client.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }
    
    client.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = client.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    client.getName = (jid, withoutContact  = false) => {
        id = client.decodeJid(jid)
        withoutContact = client.withoutContact || withoutContact 
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = client.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === client.decodeJid(client.user.id) ?
        client.user :
            (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }
    
    client.setStatus = (status) => {
        client.query({
            tag: 'iq',
            attrs: {
                to: '@s.whatsapp.net',
                type: 'set',
                xmlns: 'status',
            },
            content: [{
                tag: 'status',
                attrs: {},
                content: Buffer.from(status, 'utf-8')
            }]
        })
        return status
    }
	
    client.public = true

    client.serializeM = (m) => smsg(client, m, store)
    client.ev.on('connection.update', async (update) => {
        console.log("update")
        const { connection, lastDisconnect } = update	    
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect['error']).output.statusCode
            if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); process.exit(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); startServer(); } 
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); startServer(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); process.exit(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Delete Session file yusril.json and Scan Again.`); process.exit(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); startServer(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); startServer(); }
            else { console.log(`Unknown DisconnectReason: ${reason}|${connection}`); startServer(); }
        } else if(connection === 'open') {
            console.log('Bot conneted to server')
        } else {
            console.log(update)
        }
        // console.log('Connected...', update)
    })

    client.ev.on('creds.update', saveState)

    client.sendText = (jid, text, quoted = '', options) => client.sendMessage(jid, { text: text, ...options }, { quoted })

    client.cMod = (jid, copy, text = '', sender = client.user.id, options = {}) => {
        //let copy = message.toJSON()
		let mtype = Object.keys(copy.message)[0]
		let isEphemeral = mtype === 'ephemeralMessage'
        if (isEphemeral) {
            mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
        }
        let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
		let content = msg[mtype]
        if (typeof content === 'string') msg[mtype] = text || content
		else if (content.caption) content.caption = text || content.caption
		else if (content.text) content.text = text || content.text
		if (typeof content !== 'string') msg[mtype] = {
			...content,
			...options
        }
        if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
		else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
		copy.key.remoteJid = jid
		copy.key.fromMe = sender === client.user.id

        return proto.WebMessageInfo.fromObject(copy)
    }

    return client
}

startServer()


let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})
