const config = require('../config/config.json');

const sendDaftarKandidat = async (client, replyTo) => {
    const sections = [
        {
            title: "Daftar Kandidat",
            rows: [
                {title: "Wahyu OSIS", rowId: "kandidat_1", description: "Wahyu OSIS Bikin project gapernah selesai"},
                {title: "Wahyu MPK", rowId: "kandidat_2", description: "Wahyu MPK Hobi berburu sertifikasi, info sertifikasi cabut perpus beginner"}
            ]
        }
    ]
    
    const listMessage = {
      text: "Hai! Klik tombol dibawah untuk melihat daftar kandidat",
      title: "Daftar kandidat",
      buttonText: "Klik disini!",
      sections
    }
    
    client.sendMessage(replyTo, listMessage).then(() => {
        client.sendMessage(replyTo, { 
            text: config.pilihan.menuKandidat
        })
    });

    return true;
}

const handleRowID = async (client, usersChat) => {
    let rowid = usersChat.message.listResponseMessage.singleSelectReply.selectedRowId;


    client.sendMessage(usersChat.key.remoteJid, { text: config.menu[rowid]})
    return true
}
module.exports = { sendDaftarKandidat, handleRowID }
