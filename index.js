// index.js
require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { status } = require('minecraft-server-util');
const { deploy } = require('./deploy-commands.js');

const CONFIG_PATH = './servers.json';
const servers = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH))
  : {};
const intervals = {};  // track monitoring intervals

const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await deploy();
  for (const id of Object.keys(servers)) {
    intervals[id] = monitorServer(id);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  if (commandName === 'initiate') {
    const ip       = interaction.options.getString('ip');
    const port     = interaction.options.getInteger('port');
    const alias    = interaction.options.getString('alias') || `${ip}:${port}`;
    const id       = `${ip}:${port}`;
    const channelId = interaction.channelId;

    if (servers[id]) {
      return interaction.reply(`⚠️ **${alias}** is already being monitored.`);
    }

    servers[id] = { ip, port, alias, status: 'unknown', players: [], channelId };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2));

    intervals[id] = monitorServer(id);
    return interaction.reply(`🔧 Now monitoring **${alias}** in this channel!`);
  }

  if (commandName === 'remove') {
    const aliasInput = interaction.options.getString('alias');
    const id = Object.keys(servers)
      .find(key => servers[key].alias === aliasInput || key === aliasInput);
    if (!id) {
      return interaction.reply(`❌ No monitored server found for \`${aliasInput}\`.`);
    }
    clearInterval(intervals[id]);
    delete intervals[id];
    const removed = servers[id];
    delete servers[id];
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2));
    return interaction.reply(`🗑️ Stopped monitoring **${removed.alias}**.`);
  }
});

function monitorServer(id) {
  return setInterval(async () => {
    const srv = servers[id];
    try {
      const s = await status(srv.ip, srv.port, { timeout: 5000 });
      if (srv.status !== 'online') notify(`🟢 **${srv.alias}** is online!`, srv);

      const online = s.players.sample?.map(p => p.name) || [];
      const joined = online.filter(p => !srv.players.includes(p));
      const left   = srv.players.filter(p => !online.includes(p));

      joined.forEach(p => notify(`🎉 **${p}** joined **${srv.alias}**`, srv));
      left.forEach(p => notify(`👋 **${p}** left **${srv.alias}**`, srv));

      srv.players = online;
      srv.status  = 'online';
    } catch {
      if (srv.status !== 'offline') {
        notify(`🔴 **${srv.alias}** at \`${srv.ip}:${srv.port}\` has shut down!`, srv);
      }
      srv.status  = 'offline';
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