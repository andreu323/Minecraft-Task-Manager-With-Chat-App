
const express = require("express");
const router = express.Router();
const { DiscussServiceClient } = require("@google/generative-ai");
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
let requests_to_gpt = []

const context = `
    для контекста постов: "ары это валюта на сервере minecraft и данные посты опубликованы в социальной сети
    по теме minecraft сервера также игроки имеют ник неймы, на сервере есть стример под именем пятерка."

    Твое Задание:
    Выбери посты из данных тебе которые бы заинтересовали игрока сп и запиши их в Json и опиши их очень кратко максимум в 50 символов,
    ненадо писатьв ответе данные сервера или примечания! нужно только Json с картким описанием постов!
    
    Формат Json Обезательно как следущий:
    [
        "краткое описание поста","следущие краткое описание поста"
    ]
    Информацию нельзя изменять.
    `;


(async function main() {





    const API_KEY = "if u need api key go to the google ai studio its free for everyone";

    const genAI = new GoogleGenerativeAI(API_KEY);
    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }, 
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
    ];
    const model = genAI.getGenerativeModel({
        model: "gemini-1.0-pro",
        
        safetySettings,
    });
    const context = "";
    const examples = [];

    const generationConfig = {
        "temperature": 0.25,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "text/plain",
    };

    
   // const posts = ["Приглашаю вас на долгожданное торжество в честь открытия нового проекта Дом Искусств х ТФ Искусств! Вечер чтения и музыки Выставка артов =Ждём вас уже в эту пятницу, 24 марта, в 19:00!= =МЕСТО: СПАВН ПО КОВРИКАМ (Там где музей артов и Дом Искусств)= Заходите в дискорд, чтобы поучавствовать в ивенте! https://discord.gg/czG3pJK8", "ЕКА ГРИФАНУЛ МНЕ ДОМ", "Хостинг Сп би лайк:"];
    (async function requests_queue() {

        if (requests_to_gpt.length > 0) {

            try {
                const history = requests_to_gpt[0].history.map(entry => {
                    return {
                        role: entry.player_uuid ? "user" : "model",
                        parts: entry.player_uuid ? [{ text: "player_uuid=" + entry.player_uuid + ", nickname=" + entry.nickname + ":" + entry.text }] : [{ text: entry.text }],  // Adjust based on how the text/content is stored
                    };
                }).reverse();

                const chatSession = model.startChat({
                    generationConfig, 
                    // safetySettings: Adjust safety settings
                    // See https://ai.google.dev/gemini-api/docs/safety-settings
                    history,
                });

                const result = await chatSession.sendMessage('context: ur are a minecraft tasks related chat bot ur task is to asnwer user, do not put AI BOT: at start of ur answer!! and there is no message format.' + ". answer this user with player uuid:" + requests_to_gpt[0].player_uuid + ", with a nickname " + requests_to_gpt[0].nickname + " message: " + requests_to_gpt[0].message);
               
                if(result.response.candidates) requests_to_gpt[0].response = result.response.candidates[0].content.parts[0].text;
                else requests_to_gpt[0].response = "ai bot cannot answer to that."
                requests_to_gpt.shift();
            } catch (error) {
                console.log(error)
                requests_to_gpt[0].response = error.message;
                requests_to_gpt.shift();
            }
        }

        setTimeout(requests_queue, 15);
    })();
})();

const gpt_request = async (history, message, player_uuid, nickname, images) => {
    const request = { response: 0, message, history, player_uuid, nickname, images }
    requests_to_gpt.push(request);

    return new Promise((resolve, reject) => {
        async function waiting_for_response() {
            if (request.response != 0) {
                resolve(request.response);
                return;
            }
            setTimeout(waiting_for_response, 1);
        };
        waiting_for_response();
    });



}
module.exports = { gpt_request };