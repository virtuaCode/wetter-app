import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs'
const qs = require('node:querystring');
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import * as jsdom from "jsdom"

@Injectable()
export class AppService {
  days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  daysGerman = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]

  wetterOberfranken = "https://www.mein-wetter.com/wetter/franken-oberfranken.htm"
  gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  cities = [
    {
      id: "bamberg",
      name: "Bamberg",
      lat: 49.901193,
      lon: 10.889831
    },
    {
      id: "forchheim",
      name: "Forchheim",
      lat: 49.72227302829307,
      lon: 11.059637994808242
    },
    {
      id: "kulmbach",
      name: "Kulmbach",
      lat: 50.10753525431489,
      lon: 11.443265835122602
    },
    {
      id: "bayreuth",
      name: "Bayreuth",
      lat: 49.94460274458677,
      lon: 11.571914470044986
    },
    {
      id: "coburg",
      name: "Coburg",
      lat: 50.26454169224746,
      lon: 10.958702990908975,
    },
    {
      id: "kronach",
      name: "Kronach",
      lat: 50.23690043110816,
      lon: 11.327279334623018,
    },
    {
      id: "lichtenfels",
      name: "Lichtenfels",
      lat: 50.14093928784083,
      lon: 11.055421407492815
    },
    {
      id: "hof",
      name: "Hof",
      lat: 50.31243386221696,
      lon: 11.9124159778565
    },
    {
      id: "wunsiedel",
      name: "Wunsiedel",
      lat: 50.040491350523375,
      lon: 12.004994377909737,
    },
  ];
  cache: Map<string, any> = new Map();
  geminiCache: Map<string, any> = new Map()
  base = process.env.WEATHER_BASE_URL;

  getIndex() {
    const date = new Date();
    return "/weather/" + this.getCities()[0].id + "/" + this.days[date.getDay()]
  }

  getGenerateTextCached(date: Date, city: any) {
    const query = {
      date: this.getGermanyMidnightDate(date).toISOString(),
      id: city.id
    }

    const querystring = qs.stringify(query);

    return this.geminiCache.get(querystring) || "???"

  }

  async getGeneratedText(prompt: string, date: Date, city: any, json: any) {
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

    await fs.promises.writeFile('weather.json', JSON.stringify(json, null, 4))

    const uploadResult = await fileManager.uploadFile(`weather.json`, {
      mimeType: "text/javascript",
      displayName: "Weather",
    });

    // View the response.
    console.log(
      `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`,
    );

    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    const query = {
      date: this.getGermanyMidnightDate(date).toISOString(),
      id: city.id
    }

    const querystring = qs.stringify(query);

    this.geminiCache.set(querystring, result.response.text())

    return result.response.text()
  }

  getGermanyMidnightDate(date) {
    // Create a date in the local time zone
    const date2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Convert to Germany time zone (Central European Time)
    const germanyDate = new Date(date2.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));

    // Set the time to 00:00:00
    germanyDate.setHours(0, 0, 0, 0);

    return germanyDate;
  }

  getCities() {
    return this.cities
  }

  getDays(k) {

    const days = [...this.days];

    for (let i = 0; i < k; i++) {
      days.push(days.shift());
    }

    return days;
  }


  addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }


  async getWeatherForCities(date) {
    const cities = {}


    for (const city of this.cities) {
      const weather = await this.getWeather(date, city)
      const groups = this.groupWeather(weather, 4)
      cities[city.id] = {
        name: city.name,
        min: Math.round(Math.min(...weather.map(e => e.temperature))),
        max: Math.round(Math.max(...weather.map(e => e.temperature))),
        wind: Math.round(Math.max(...weather.map(e => e.wind_speed))),
        groups,
      }
    }

    return cities
  }

  async getWeather(date, city): Promise<any> {

    const query = {
      date: this.getGermanyMidnightDate(date).toISOString(),
      lat: city.lat,
      lon: city.lon
    }
    try {
      const querystring = qs.stringify(query);
      if (this.cache.has(querystring)) {
        console.log("Retrieved from cache (" + querystring + ")");
        return this.cache.get(querystring);
      }


      const result = await axios.get(this.base, { params: query });
      this.cache.set(querystring, result.data.weather)

      return result.data.weather;
    } catch (error) {
      console.error(error.message)
      return {}
    }
  }

  mostFrequentUsingMap(arr, deleteDry = true) {
    const counts = new Map();

    for (let num of arr) {
      counts.set(num, (counts.get(num) || 0) + 1);
    }

    let mostFrequent;
    let maxCount = 0;

    if (deleteDry) {
      const dryCount = counts.get("dry") || 0;

      if (dryCount === arr.length) {
        return "dry";
      } else {
        counts.delete("dry");
      }
    }

    counts.forEach((count, num) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = num;
      }
    });

    return mostFrequent;
  }

  groupWeather(weatherDay, hours) {
    const grouped = [];

    for (let i = 0; i < Math.round(24 / hours); i++) {

      let meanTemperatur = 0;
      let maxWind = 0;
      let conditions = []
      let icons = []

      for (let k = 0; k < hours; k++) {
        const hour = weatherDay[i * hours + k];
        conditions.push(hour.condition)
        icons.push(hour.icon)
        meanTemperatur += hour.temperature;
        maxWind = hour.wind_speed > maxWind ? hour.wind_speed : maxWind;
      }

      meanTemperatur = Math.round(meanTemperatur / hours);
      const condition = this.mostFrequentUsingMap(conditions);
      const icon = this.mostFrequentUsingMap(icons)

      grouped.push({
        time: i * hours + " bis " + (i * hours + hours) + " Uhr",
        temperature: meanTemperatur,
        condition: this.weatherInGerman(condition),
        icon: this.translateWeatherToGerman(icon),
        iconImage: this.translateWeatherToIcon(icon),
        wind: Math.round(maxWind),
      })

    }


    return grouped
  }

  async getWeatherOberfranken() {
    const url = this.wetterOberfranken;

    const result = await axios.get(url);

    const dom = new jsdom.JSDOM(result.data)

    const days = dom.window.document.querySelectorAll("#blockfooter .seven-day-fc2")

    const dayElements = [...Array.from(days.values())];

    const data = dayElements.map(e => {
      const [YYYY, MM, DD] = e.querySelector("time").getAttribute("datetime").split('-')
      const date = new Date(+YYYY, +MM - 1, +DD);

      return {
        day: this.daysGerman[date.getDay()],
        date: date,
        icon: "https://www.mein-wetter.com" + e.querySelector("img").src,
        alt: e.querySelector("img").alt,
        min: e.querySelector(".temp-low2").textContent,
        max: e.querySelector(".temp-high2").textContent,
      }
    })

    return data

  }


  translateWeatherToGerman(condition) {
    switch (condition) {
      case "clear-day":
        return "Klarer Tag";
      case "clear-night":
        return "Klare Nacht";
      case "partly-cloudy-day":
        return "Teilweise bewölkter Tag";
      case "partly-cloudy-night":
        return "Teilweise bewölkte Nacht";
      case "cloudy":
        return "Bewölkt";
      case "fog":
        return "Nebel";
      case "wind":
        return "Wind";
      case "rain":
        return "Regen";
      case "sleet":
        return "Graupel";
      case "snow":
        return "Schnee";
      case "hail":
        return "Hagel";
      case "thunderstorm":
        return "Gewitter";
      default:
        return "Unbekannte Wetterbedingung";
    }
  }

  translateWeatherToIcon(condition) {
    switch (condition) {
      case "clear-day":
        return "qi-100";
      case "clear-night":
        return "qi-150";
      case "partly-cloudy-day":
        return "qi-103";
      case "partly-cloudy-night":
        return "qi-153";
      case "cloudy":
        return "qi-104";
      case "fog":
        return "qi-501";
      case "wind":
        return "qi-1080";
      case "rain":
        return "qi-307";
      case "sleet":
        return "qi-405";
      case "snow":
        return "qi-401";
      case "hail":
        return "qi-1015";
      case "thunderstorm":
        return "qi-303";
      default:
        return "qi-100";
    }

  }
  weatherInGerman(condition) {
    switch (condition.toLowerCase()) {
      case "dry":
        return "Trocken";
      case "fog":
        return "Nebel";
      case "rain":
        return "Regen";
      case "sleet":
        return "Graupel";
      case "snow":
        return "Schnee";
      case "hail":
        return "Hagel";
      case "thunderstorm":
        return "Gewitter";
      default:
        return "Unbekannte Wetterbedingung";
    }


  }




}
