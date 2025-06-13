// deploy-commands.js
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const commands = [
  new SlashCommandBuilder()
    .setName('initiate')
    .setDescription('Configure a Minecraft server to monitor')
    .addStringOption(o => o
      .setName('ip')
      .setDescription('Server IP or hostname')
      .setRequired(true))
    .addIntegerOption(o => o
      .setName('port')
      .setDescription('Server port')
      .setRequired(true))
    .addStringOption(o => o
      .setName('alias')
      .setDescription('Friendly name (e.g. Survival)'))
    .toJSON()
];

export async function deploy(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  // use the app's own ID at runtime
  const appId = client.application.id;
  console.log(`🚀 Registering commands for app ${appId}…`);
  await rest.put(
    Routes.applicationCommands(appId),
    { body: commands }
  );
  console.log('✅ /initiate deployed');
}

// if run directly (for testing)
if (require.main === module) {
  import('discord.js').then(({ Client, GatewayIntentBits }) => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.once('ready', () => deploy(client).then(() => process.exit()));
    client.login(process.env.DISCORD_TOKEN);
  });
}
