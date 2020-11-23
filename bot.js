'use strict';
const Discord = require('discord.js');
const Util = require('./Util');
const discordauth = require('./discordauth.json');
const client = new Discord.Client();
const { GoogleSpreadsheet } = require('google-spreadsheet')
var botObj;
var lastTarkovData;
const dollarConvRate = 113;
const euroConvRate = 126;
var sheetUpdating = false;
var sheet;
/** 
 * @returns {number} price in roubles
*/
function normalizeTraderPrice(item){
    var normalizedTraderPrice = item.traderPrice;
    if(item.traderPriceCur=="$")
        normalizedTraderPrice = normalizedTraderPrice*dollarConvRate;
    else if (item.traderPriceCur=="€")
        normalizedTraderPrice = normalizedTraderPrice*euroConvRate;    
    return normalizedTraderPrice;
}
/**
 * 
 * @param {*} item 
 * @returns {string}
 */
function generateNotificationText(item){    
    var sendScreen = `${item.name} is being sold for ${item.price} and can be sold to ${item.traderName} for ${item.traderPriceCur}${item.traderPrice}`;
                        if(item.traderPriceCur!="₽")
                            sendScreen += `(~₽${item.priceinroubles})`;
    sendScreen += ` + ₽${item.profit}`                            
    return sendScreen;
}

function sendDiscordMessage(message) {
    var guild = client.guilds.cache.get('541012983082385408');
                        var channel = guild.channels.cache.find(i => i.name === 'tarkov');                        
                        channel.send(message);
}

async function updateGSheet(){
    Promise.resolve();
    if(sheetUpdating){
        return;
    }
    sheetUpdating=true;
    const doc = new GoogleSpreadsheet('1F-jidFF89GzmVcS17R3gbZz7YiEvhNA6eHa1lnaxC1c');
    await doc.useServiceAccountAuth(require('./gsheetauth.json'));
    await doc.loadInfo(); 
    sheet = doc.sheetsByIndex[0];    
    var properties = Object.getOwnPropertyNames(lastTarkovData[0]);
    await sheet.resize({rowCount:lastTarkovData.length,columnCount:properties.length})
    //await sheet.setHeaderRow(properties);
    const rows = await sheet.getRows();
    var i,j,temparray,chunk = 100;
    console.log(`Processing ${lastTarkovData.length} rows`)
    var clonedArray= lastTarkovData.slice(0) 
    var countChanges = 0;


    await lastTarkovData.reduce(async (memo, item) => {
        await memo;
        var filterSheet = rows.filter(x=>x.uid==item.uid);
        if(filterSheet.length==0){
            
        }else{            
            countChanges++;
            clonedArray = clonedArray.filter(cloneditem=>item.uid!=cloneditem.uid);
            var itemUpdate = new Date(item.updated); 
            var rowUpdate = new Date(filterSheet[0].updated); 
            if(rowUpdate<itemUpdate){
                var saveObj = Object.assign(filterSheet[0],item);
                try{
                await saveObj.save();
                }catch{}
                await sleep(250);
            }            
        }
    }, undefined)

    

    lastTarkovData.forEach(async item=>{
                
    })
    sheet.saveUpdatedCells();
    console.log(`Updated ${countChanges} rows`)
    console.log(`New ${clonedArray.length} rows`)
    var i,j,temparray,chunk = 100;
    for (i=0,j=clonedArray.length; i<j; i+=chunk) {
        temparray = clonedArray.slice(i,i+chunk);
        await sheet.addRows(temparray);
    }

    
    sheetUpdating=false;    
}


function compareitems(a, b) {
    if (a.profit < b.profit) return 1;
    if (b.profit < a.profit) return -1;
  
    return 0;
  }

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
class TarkovBot{
    constructor(){
        botObj=this;
    }

    /**
    * @param {boolean} test = false
    */
    connect(test){
        let isTest = test ? test:false;
        Promise.resolve()
            .then(() => client.login(discordauth.authkey))            
            .then(() => console.log('Discord Bot is running!'))
            .then(() => client.addListener('message',this.processMessage.bind(this)))
            .then(()=>{
                if(isTest){
                    client.destroy();
                }
            })
            .then(()=>{
                setInterval(this.findQuickMoney,16500);
                setInterval(updateGSheet,60000*5);
            })
            .catch(error => Util.error(error));
        
    }
    /**
     * @param {DiscordMessage} msg
     */
    async processMessage(msg) {
        await Promise.resolve();
        if(msg.content=="tkv prime market"){
            updateGSheet();
            msg.reply("https://docs.google.com/spreadsheets/d/1F-jidFF89GzmVcS17R3gbZz7YiEvhNA6eHa1lnaxC1c");
        }        
    }


    async findQuickMoney(){
        var https = require('follow-redirects').https;
        var fs = require('fs');

        var https = require('follow-redirects').https;
        var fs = require('fs');

        var options = {
        'method': 'GET',
        'hostname': 'tarkov-market.com',
        'path': '/api/v1/items/all',
        'headers': require('./tarkovmarketauth.json'),
        'maxRedirects': 20
        };

        var req = https.request(options, function (res) {
        var chunks = [];

        res.on("data", function (chunk) {
            chunks.push(chunk);
        });

        res.on("end", function () {
            var body = Buffer.concat(chunks);
            
            var itemarray = JSON.parse(body);            
            try{            
            itemarray.forEach((item)=>{
                item.priceinroubles = normalizeTraderPrice(item);
                item.profit = (item.priceinroubles-item.price);
            })
            lastTarkovData=itemarray.sort(compareitems);
            
            
            var minTime = 90000000000;
                    itemarray.forEach(item=>{
                        var utcTime = new Date(new Date().toUTCString());
                        var itemUpdateTime = new Date(item.updated);
                        var currentDiff = parseInt((utcTime - itemUpdateTime));
                        if(currentDiff<minTime){
                            minTime=currentDiff;
                        }
                    })  
                    console.log(`updated mintime:${minTime}`);
            itemarray.forEach((item)=>{
                try {
                    
                                                 
                    if(item.profit>0 && parseInt((utcTime - itemUpdateTime))< 300000) {                        
                        var sendScreen = generateNotificationText(item);
                        console.log(sendScreen);
                        sendDiscordMessage(sendScreen);                        
                    }   
                } catch (error) {
                    
                }
            })
        
        }catch(error){}});
        
        res.on("error", function (error) {
            console.error(error);
        });
        });

        req.end();
        
        Promise.resolve()
    }


}
module.exports = TarkovBot;
