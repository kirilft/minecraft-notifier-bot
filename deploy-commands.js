// deploy-commands.js
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, Client, GatewayIntentBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('initiate')
    .setDescription('Configure a Minecraft server to monitor')
    .addStringOption(o => o.setName('ip').setDescription('Server IP or hostname').setRequired(true))
    .addIntegerOption(o => o.setName('port').setDescription('Server port').setRequired(true))
    .addStringOption(o => o.setName('alias').setDescription('Friendly name (e.g. Survival)'))
    .toJSON()
];

async function deploy() {
  // create a short-lived client to fetch our own app ID
  const temp = new Client({ intents: [GatewayIntentBits.Guilds] });
  await temp.login(process.env.DISCORD_TOKEN);
  const appId = temp.application.id;
  temp.destroy();

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  console.log(`🚀 Registering commands for app ${appId}…`);
  await rest.put(Routes.applicationCommands(appId), { body: commands });
  console.log('✅ /initiate deployed');
}

if (require.main === module) {
  deploy().catch(console.error);
} else {
  module.exports = { deploy };
}
