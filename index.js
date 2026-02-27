require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

let monChatId = null;
let seuilAlerte = 90000;
let crypto = "bitcoin";
let lastPrice = {
  valeur: null,
  date: null,
};

async function getCryptoPrice(id) {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    );
    lastPrice.valeur = res.data[id].usd;
    lastPrice.date = new Date();
    return lastPrice;
  } catch (error) {
    return null;
  }
}

async function getLastPrice() {
  if (lastPrice.date && new Date() - lastPrice.date < 60000) {
    return lastPrice;
  } else {
    const prix = await getCryptoPrice(crypto);
    return prix;
  }
}

bot.start((ctx) => {
  monChatId = ctx.chat.id;
  ctx.reply(`Bot activé, seuil: ${seuilAlerte}$`);
  ctx.reply(`C'est bon ! Votre ID (${monChatId}) est enregistré.`);
});

bot.command("prix", async (ctx) => {
  const currentPrice = await getLastPrice();
  if (currentPrice && currentPrice.valeur) {
    ctx.reply(
      `Prix actuel de ${crypto} : ${currentPrice.valeur} $ (dernière mise à jour : ${currentPrice.date.toLocaleTimeString()})`,
    );
    console.log(
      "message envoyé : " + JSON.stringify(ctx.message.text, null, 2),
    );
  } else {
    ctx.reply("Erreur c'est produite");
  }
});

bot.command("set", (ctx) => {
  const args = ctx.message.text.split(" ");
  const val = parseFloat(args[1]);
  if (!isNaN(val)) {
    seuilAlerte = val;
    monChatId = ctx.chat.id;
    ctx.reply(`Nouveau seuil : ${seuilAlerte} $`);
  } else {
    ctx.reply("Format invalide. Utilisez /set <valeur>");
  }
});

bot.command("choose", async (ctx) => {
  await ctx.reply("");
});

async function checkLoop() {
  console.log("Vérification du prix...");
  if (!monChatId) return;
  const currentPrice = await getLastPrice();
  console.log(currentPrice);

  if (currentPrice.valeur <= seuilAlerte) {
    bot.telegram.sendMessage(
      monChatId,
      `ALERTE : ${crypto} à ${currentPrice.valeur} $ (Seuil : ${seuilAlerte}$)`,
    );
  }
}

setInterval(checkLoop, 60000);

bot.telegram.deleteWebhook().then(() => {
  bot.launch().then(() => console.log("Bot lancé !"));
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
