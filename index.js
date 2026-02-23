const { Telegraf } = require("telegraf");
const axios = require("axios");

const TOKEN = "8365267679:AAGNr_3RLI4g1iSVmLdnxK36F5jXNlhyEdY";
const bot = new Telegraf(TOKEN);

let monChatId = null;
let seuilAlerte = 90000;
let crypto = "bitcoin";

// get le prix de la cryptomonnaie
async function getCryptoPrice(crypto) {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`,
    );
    return res.data[crypto].usd;
  } catch (error) {
    return null;
  }
}

async function checkLoop() {
  if (!monChatId) return; // Si pas d'ID, on ne fait rien
  const prix = await getCryptoPrice();
  if (prix && prix < seuilAlerte) {
    bot.telegram.sendMessage(monChatId, `ALERTE : Bitcoin à ${prix} $`);
  }
}

//commands
bot.start((ctx) => {
  monChatId = ctx.chat.id;
  ctx.reply(`C'est bon ! Votre ID (${monChatId}) est enregistré.`);
});

bot.command("prix", async (ctx) => {
  const prix = await getCryptoPrice(crypto);
  ctx.reply(`Prix : ${prix} $`);
});

bot.command("setseuil", (ctx) => {
  const val = parseFloat(ctx.message.text.split(" ")[1]);
  if (!isNaN(val)) {
    seuilAlerte = val;
    monChatId = ctx.chat.id;
    ctx.reply(`Seuil réglé à ${seuilAlerte} $`);
  } else {
    ctx.reply(
      "Merci d'utiliser la syntaxe suivante : <code>/setseuil [valeur US$]</code>",
      { parse_mode: "HTML" },
    );
  }
});

bot.command("choose", async (ctx) => {
  await ctx.reply("");
});

setInterval(checkLoop, 300000);

bot.launch().then(() => console.log("Bot lancé !"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
