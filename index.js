require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { status, query } = require('minecraft-server-util');

const CONFIG_PATH = './servers.json';
let servers = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH))
  : {};

const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  // Start monitor loops for any pre-configured servers
  for (const key in servers) monitorServer(key);
});

client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName === 'initiate') {
    const ip    = i.options.getString('ip');
    const port  = i.options.getInteger('port');
    const alias = i.options.getString('alias') || `${ip}:${port}`;
    const id    = `${ip}:${port}`;

    servers[id] = { ip, port, alias, status: 'unknown', players: [] };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2));
    monitorServer(id);

    return i.reply(`🔧 Monitoring **${alias}** at \`${ip}:${port}\` now active!`);
  }
});

// Monitor loop factory
function monitorServer(id) {
  const srv = servers[id];
  setInterval(async () => {
    try {
      // Query full status (players + latency)
      const s = await status(srv.ip, srv.port, { timeout: 5000 });
      // 4️⃣ Online detection
      if (srv.status !== 'online') {
        notify(`🟢 **${srv.alias}** is online!`, srv);
      }

      // 1️⃣ & 2️⃣ Player join/leave
      const current = s.players.sample?.map(p => p.name) || [];
      const joined = current.filter(x => !srv.players.includes(x));
      const left   = srv.players.filter(x => !current.includes(x));
      joined.forEach(p => notify(`🎉 **${p}** joined **${srv.alias}**`, srv));
      left.forEach(p => notify(`👋 **${p}** left **${srv.alias}**`, srv));

      srv.players = current;
      srv.status  = 'online';
    } catch {
      // 3️⃣ Shutdown detection
      if (srv.status !== 'offline') {
        notify(`🔴 **${srv.alias}** at \`${srv.ip}:${srv.port}\` has shut down!`, srv);
      }
      srv.status = 'offline';
      srv.players = [];
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2));
  }, 15_000); // check every 15s
}

// Centralized notification helper:
function notify(msg, srv) {
  // Replace CHANNEL_ID with your target channel, or read from env/config
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  if (channel) channel.send(msg);
}

client.login(process.env.DISCORD_TOKEN);
