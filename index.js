// index.js
require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { status } = require('minecraft-server-util');

const CONFIG_PATH = './servers.json';
const servers = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH))
  : {};

const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  // deploy slash-commands on startup
  await import('./deploy-commands.js').then(m => m.deploy(client));
  // start monitoring any pre-configured servers
  for (const id of Object.keys(servers)) monitorServer(id);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'initiate') {
    const ip       = interaction.options.getString('ip');
    const port     = interaction.options.getInteger('port');
    const alias    = interaction.options.getString('alias') || `${ip}:${port}`;
    const id       = `${ip}:${port}`;
    const channelId = interaction.channelId;

    servers[id] = { ip, port, alias, status: 'unknown', players: [], channelId };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2));

    monitorServer(id);
    return interaction.reply(`🔧 Now monitoring **${alias}** in this channel!`);
  }
});

function monitorServer(id) {
  const srv = servers[id];
  setInterval(async () => {
    try {
      const s = await status(srv.ip, srv.port, { timeout: 5000 });
      if (srv.status !== 'online') notify(`🟢 **${srv.alias}** is online!`, srv);
      const onlinePlayers = s.players.sample?.map(p => p.name) || [];
      const joined = onlinePlayers.filter(p => !srv.players.includes(p));
      const left   = srv.players.filter(p => !onlinePlayers.includes(p));
      joined.forEach(p => notify(`🎉 **${p}** joined **${srv.alias}**`, srv));
      left.forEach(p => notify(`👋 **${p}** left **${srv.alias}**`, srv));
      srv.players = onlinePlayers;
      srv.status  = 'online';
    } catch {
      if (srv.status !== 'offline') {
        notify(`🔴 **${srv.alias}** at \`${srv.ip}:${srv.port}\` has shut down!`, srv);
      }
      srv.status = 'offline';
      srv.players = [];
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2));
  }, 15_000);
}

async function notify(message, srv) {
  const channel = await client.channels.fetch(srv.channelId);
  if (channel.isTextBased()) channel.send(message);
}

client.login(process.env.DISCORD_TOKEN);
