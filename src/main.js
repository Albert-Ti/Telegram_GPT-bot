import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import config from "config";
import { ogg } from "./OggConverter.js";
import { openai } from "./openai.js";
import { code } from "telegraf/format";

console.log(config.get('TEST_ENV'));


const INITIAL_SESSION = {
   messages: []
}
const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));


bot.use(session()); // чтобы ссесия не прерывалась с GPT чатом

bot.command('new', async (ctx) => {
   ctx.session = INITIAL_SESSION;
   await ctx.reply('Жду вашего голосового или тектового сообщения');
})
bot.command('start', async (ctx) => {
   ctx.session = INITIAL_SESSION;
   await ctx.reply('Жду вашего голосового или тектового сообщения');
})


bot.on(message('voice'), async (ctx) => { // обработка текста
   ctx.session ??= INITIAL_SESSION;
   try {
      await ctx.reply(code('Сообщение обрабатывается. Жду ответа от сервера...'));
      const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id); // ссылка на г. сообщ
      const userId = String(ctx.message.from.id);

      const oggPath = await ogg.create(link.href, userId);
      const mp3Path = await ogg.toMp3(oggPath, userId);

      const text = await openai.transcription(mp3Path);
      await ctx.reply(code(`Ваш запрос: ${text}`));

      ctx.session.messages.push({ role: openai.roles.USER, content: text });
      const response = await openai.chat(ctx.session.messages);
      ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });

      await ctx.reply(response.content);
   } catch (error) {
      console.log('Error while voice message', error.message);
   }
})
bot.on(message('text'), async (ctx) => { // обработка текста
   ctx.session ??= INITIAL_SESSION;
   try {
      await ctx.reply(code('Сообщение обрабатывается. Жду ответа от сервера...'));

      ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text });
      const response = await openai.chat(ctx.session.messages);
      ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });

      await ctx.reply(response.content);
   } catch (error) {
      console.log('Error while text message', error.message);
   }
})

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));