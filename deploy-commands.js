import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const commands = [
  new SlashCommandBuilder()
    .setName('initiate')
    .setDescription('Configure a Minecraft server to monitor')
    .addStringOption(o => o.setName('ip')
      .setDescription('Server IP or hostname').setRequired(true))
    .addIntegerOption(o => o.setName('port')
      .setDescription('Server port').setRequired(true))
    .addStringOption(o => o.setName('alias')
      .setDescription('Friendly name (e.g. Survival)'))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log('✅ /initiate deployed');
})();
