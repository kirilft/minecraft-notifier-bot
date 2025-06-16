// deploy-commands.js
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, Client, GatewayIntentBits } = require('discord.js');

// Define slash commands: initiate, remove, list
const commands = [
  new SlashCommandBuilder()
    .setName('initiate')
    .setDescription('Configure a Minecraft server to monitor')
    .addStringOption(o =>
      o.setName('ip')
       .setDescription('Server IP or hostname')
       .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('port')
       .setDescription('Server port')
       .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('alias')
       .setDescription('Friendly name (e.g. Survival)')
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Stop monitoring a configured Minecraft server')
    .addStringOption(o =>
      o.setName('alias')
       .setDescription('Alias or IP:Port of the server to remove')
       .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all monitored Minecraft servers')
    .toJSON()
];

async function deploy() {
  // Temporary client to fetch our application's ID
  const temp = new Client({ intents: [GatewayIntentBits.Guilds] });
  await temp.login(process.env.DISCORD_TOKEN);
  const appId = temp.application.id;
  await temp.destroy();

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  console.log(`🚀 Registering commands for app ${appId}…`);
  await rest.put(Routes.applicationCommands(appId), { body: commands });
  console.log('✅ Slash commands deployed: initiate, remove, list');
}

if (require.main === module) {
  deploy().catch(console.error);
} else {
  module.exports = { deploy };
}
