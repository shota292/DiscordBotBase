const http = require('http');
const querystring = require('querystring');
const discord = require('discord.js');
const client = new discord.Client();
const axios= require('axios');
const qs= require('qs');
const discordbtn = require('discord.js-buttons')(client);
const Keyv = require('keyv');
const servers = new Keyv('sqlite://db.sqlite', { table: 'servers' });

http.createServer(function(req, res){
 if (req.method == 'POST'){
   var data = "";
   req.on('data', function(chunk){
     data += chunk;
   });
   req.on('end', function(){
     if(!data){
        console.log("No post data");
        res.end();
        return;
     }
     var dataObject = querystring.parse(data);
     console.log("post:" + dataObject.type);
     if(dataObject.type == "wake"){
       console.log("Woke up in post");
       res.end();
       return;
     }
     res.end();
   });
 }
 else if (req.method == 'GET'){
   res.writeHead(200, {'Content-Type': 'text/plain'});
   res.end('Discord Bot is active now\n');
 }
}).listen(3000);

client.on('ready', message =>{
 console.log('Bot準備完了～');
 client.user.setPresence({ activity: { name: 'メンションでBOTを起動' } });
});

client.on('message', async message =>{
 if (message.author.id == client.user.id){
   return;
 }
 if(message.mentions.has(client.user)){
   //sendReply(message, "呼びましたか？");
   await message.delete({ timeout: 0 })
   //const reply = await message.channel.send('何する？', button);
   const server = await servers.get(client.user.id);
   const serverbuttons = [];
   for (let i = 0; i < server.servers.length; i++) {
    //message.channel.send(`${i}番目:${server.servers[i].neme}`)
    const button = new discordbtn.MessageButton()
    .setStyle('green')
    .setLabel(`${server.servers[i].neme}サーバーを起動`)
    .setID(`server${i}`);
    //serverbuttons.push(new discordbtn.MessageButton().setStyle('green').setLabel(`${server.servers[i].neme}サーバーを起動`).setID('scan'))
    const reply = await message.channel.send(`${server.servers[i].neme}サーバー`,button)
    client.on('clickButton', async (button) => {
      if(button.id===`server${i}`){
        button.defer(false);
        message.channel.send(`${server.servers[i].neme}サーバーを起動中...`);
        start_exe(server.servers[i].Cookie);
        const messages = await message.channel.messages.fetch({ limit: 100 })
        // ボット以外が送信したメッセージを抽出
        const filtered = messages.filter(message => message.author.bot)
        // それらのメッセージを一括削除
        message.channel.bulkDelete(filtered)
      }
    });
   }
                         
   const button = new discordbtn.MessageButton()
    .setStyle('green')
    .setLabel('やっぱり起動しない')
    .setID('back');
   const reply = await message.channel.send(`やっぱり起動しない`,button)
   client.on('clickButton', async (button) => {
     if(button.id==='back'){
       button.defer(false);
       const messages = await message.channel.messages.fetch({ limit: 100 })
       const filtered = messages.filter(message => message.author.bot)
       // それらのメッセージを一括削除
       message.channel.bulkDelete(filtered)
     }
     　　
   });
   return;
 }
 
 if (message.content.match(/にゃ～ん|にゃーん/)){
   let text = "にゃ～ん";
   sendMsg(message.channel.id, text);
   return;
 }
 /*if (message.content.match(/test/)){
   let text = "i";
   sendMsg(message.channel.id, text);
   text = "a";
   sendMsg(message.channel.id, text);
   console.log(client.user)
   return;
 }*/
 const args = message.content.slice(":".length).trim().split(' ');
 const command = args.shift().toLowerCase();
 if (command==='gets') {
		message.channel.send(`${args[0].split('||')[1]}サーバーの情報を取得`);
    getserver(message.channel.id,args[0].split('||')[1])
 }else if(command==='start'){
   message.channel.send('サーバーを起動中...');
   start_exe(message.channel.id);
 }else if(command==='stop'){
   message.channel.send('サーバーを停止中...');
   stop_exe(message.channel.id);
 }else if(command==='add'){
   message.delete({ timeout: 0 })
   message.channel.send(`新しい${args[0]}サーバーを追加！！`);
   const server = (await servers.get(client.user.id)) || { servers:[] };
   server.servers.push({neme:args[0],Cookie:args[1].split('||')[1]})
   servers.set(client.user.id, server);
   console.log(server)
 }else if(command==='delete'){
   const server = await servers.get(client.user.id);
   message.channel.send(`${args[0]}番目の${server.servers[args[0]].neme}サーバーを削除！！`);
   server.servers.splice(args[0],1)
   servers.set(client.user.id, server);
   console.log(await servers.get(client.user.id))
   console.log(server)
 }
});



if(process.env.DISCORD_BOT_TOKEN == undefined){
console.log('DISCORD_BOT_TOKENが設定されていません。');
process.exit(0);
}

client.login( process.env.DISCORD_BOT_TOKEN );

function sendReply(message, text){
 message.reply(text)
   .then(console.log("リプライ送信: " + text))
   .catch(console.error);
}

function sendMsg(channelId, text, option={}){
 client.channels.cache.get(channelId).send(text, option)
   .then(console.log("メッセージ送信: " + text + JSON.stringify(option)))
   .catch(console.error);
}

function sendEmbed(channelId,embed){
  client.channels.cache.get(channelId).send({embed:embed})
    .then(console.log("埋め込みメッセージ送信: " + {embed:embed}))
    .catch(console.error);
}

function getserver(channelId,uuid){
  
  const data = axios.get('https://api.zpw.jp/?id='+uuid).then(res => sendEmbed(channelId, {
    title: res.data.servername,
    color: res.data.online=="online"?0x00ff00:0xff0000,
    description: res.data.serverexp+"\n"+res.data.servertype+"-"+res.data.version+"  投票数:"+res.data.votes,
    thumbnail: {
      url: `https://dash.zpw.jp/pages/servermanage/img/srvicon/${uuid}.png`
    },
    footer:{
      text:"IP:"+res.data.serverip
    },
    fields:[
      {
        name: "ステータス",
        value: res.data.online=="online"?"オンライン":"オフライン",
        inline: true
      },
      {
        name: "オンラインプレイヤー",
        value: res.data.onlineplayer+"/"+res.data.maxplayer,
        inline: true
      }
    ]
  }))
}

function start_exe(cookie){
  const data = { 'start': '','dlpass': ''};
  axios.post('https://dash.zpw.jp/pages/ ',
    qs.stringify(data),
    {
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': 'PHPSESSID='+cookie
      }
    })
    .then((response)=> {
        console.log(response.data)
    })
    .catch((error)=> {
        console.log(error)
  })
} 

function stop_exe(){
  const data = { 'stop': ''};
  axios.post('https://dash.zpw.jp/pages/ ',
    qs.stringify(data),
    {
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': 'PHPSESSID=fdmmejr1gf64qbmj7du8708c6e'
      }
    })
    .then((response)=> {
        console.log(response.data)
    })
    .catch((error)=> {
        console.log(error)
  })
} 
