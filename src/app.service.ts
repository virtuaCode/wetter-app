import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs'
const qs = require('node:querystring');
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import * as jsdom from "jsdom"
import { SettingsService } from './settings/settings.service';
import { ConfigService } from '@nestjs/config';
import { City } from './dtos/city.dto';
import { Group } from './dtos/group.dto';
import { Weather } from './dtos/weather.dto';

@Injectable()
export class AppService {
  days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  daysGerman = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
  wetterOberfranken = "https://www.mein-wetter.com/wetter/franken-oberfranken.htm"
  baseUrl: string;
  gemini: GoogleGenerativeAI;
  cache: Map<string, any> = new Map();
  cacheTime: Map<string, any> = new Map();
  geminiCache: Map<string, any> = new Map()

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService
  ) {
    this.gemini = new GoogleGenerativeAI(this.configService.getOrThrow('GEMINI_API_KEY'));
    this.baseUrl = this.configService.getOrThrow('WEATHER_BASE_URL');
  }

  getIndex() {
    const date = new Date();
    return "/weather/" + this.settingsService.getCities()[0].id + "/" + this.days[date.getDay()]
  }


  clearCacheEntry(date: Date, city: City) {
    const query = {
      date: this.getGermanyMidnightDate(date).toISOString(),
      lat: city.lat,
      lon: city.lon,
    }

    const querystring = qs.stringify(query);

    this.cacheTime.set(querystring, 0)
    this.cleanCache()
  }

  getGenerateTextCached(date: Date, city: City) {
    const query = {
      date: this.getGermanyMidnightDate(date).toISOString(),
      id: city.id
    }

    const querystring = qs.stringify(query);

    return this.geminiCache.get(querystring) || "???"
  }

  async getGeneratedText(prompt: string, date: Date, city: any, json: any) {
    const fileManager = new GoogleAIFileManager(this.configService.getOrThrow('GEMINI_API_KEY'));

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

  getGermanyMidnightDate(date: Date) {
    // Create a date in the local time zone
    const date2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Convert to Germany time zone (Central European Time)
    const germanyDate = new Date(date2.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));

    // Set the time to 00:00:00
    germanyDate.setHours(0, 0, 0, 0);

    return germanyDate;
  }

  getDaysWithOffset(k: number) {

    const days = [...this.days];

    for (let i = 0; i < k; i++) {
      days.push(days.shift() ?? "");
    }

    return days;
  }


  addDays(date: Date, days: number) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }


  async getWeatherForCities(date: Date) {
    const cities: {
      [key: string]: {
        name: string;
        min: number;
        max: number;
        wind: number;
        groups: {

        }
      }
    } = {}

    for (const city of this.settingsService.getCities()) {
      const [weather, dateCache] = await this.getWeather(date, city)
      const groups = this.groupWeather(weather, 4)
      cities[city.id] = {
        name: city.name,
        min: Math.round(Math.min(...weather.map(e => e.temperature ?? NaN))),
        max: Math.round(Math.max(...weather.map(e => e.temperature ?? NaN))),
        wind: Math.round(Math.max(...weather.map(e => e.wind_speed ?? NaN))),
        groups,
      }
    }

    return cities
  }

  cleanCache() {
    for (const key of this.cache.keys()) {
      const oldDate = new Date().getTime() - +this.settingsService.getCacheTime() * 60 * 1000;
      const time = this.cacheTime.get(key)

      if (time < oldDate) {
        console.log("Deleted from cache (" + key + ")")
        this.cache.delete(key);
        this.cacheTime.delete(key);
      }
    }
  }

  async getWeather(date: Date, city: City): Promise<[Weather[], Date]> {
    const query = {
      date: this.getGermanyMidnightDate(date).toISOString(),
      lat: city.lat,
      lon: city.lon,
    }

    this.cleanCache()

    const querystring = qs.stringify(query);
    if (this.cache.has(querystring)) {
      console.log("Retrieved from cache (" + querystring + ")");
      return [this.cache.get(querystring), new Date(this.cacheTime.get(querystring))];
    }


    const result = await axios.get(this.baseUrl, { params: query });
    const data = result.data.weather.slice(0, 24)

    this.cache.set(querystring, data)
    this.cacheTime.set(querystring, new Date().getTime())

    return [data, new Date(this.cacheTime.get(querystring))]
  }

  mostFrequentUsingMap(arr: string[], deleteDry = true) {
    const counts = new Map();

    for (let num of arr) {
      counts.set(num, (counts.get(num) || 0) + 1);
    }

    let mostFrequent;
    let maxCount = 0;

    // Deletes the condition dry when other conditions are present
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

  groupWeather(weatherDay: any, hours: number): Group[] {
    const grouped = [];

    for (let i = 0; i < Math.round(24 / hours); i++) {

      let meanTemperatur = 0;
      let maxWind = 0;
      let conditions = []
      let icons = []
      let directions = []


      for (let k = 0; k < hours; k++) {
        const hour = weatherDay[i * hours + k];
        conditions.push(hour.condition);
        icons.push(hour.icon);
        directions.push(hour.wind_direction);
        meanTemperatur += hour.temperature;
        maxWind = hour.wind_speed > maxWind ? hour.wind_speed : maxWind;
      }

      meanTemperatur = Math.round(meanTemperatur / hours);
      const condition = this.mostFrequentUsingMap(conditions);
      const icon = this.mostFrequentUsingMap(icons)

      grouped.push({
        time: i * hours + " bis " + (i * hours + hours) + " Uhr",
        temperature: meanTemperatur,
        condition: this.weatherInGerman(condition ?? ""),
        icon: this.translateWeatherToGerman(icon ?? ""),
        iconImage: this.translateWeatherToIcon(icon ?? ""),
        wind: Math.round(maxWind),
        windCompass: this.getCompassDirection(this.getCircularMean(directions))
      })


    }

    return grouped
  }

  getCompassDirection(angle: number) {
    const val = Math.floor((angle / 45) + 0.5);
    const arr = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return arr[(val % 8)]
  }

  getWeatherStats(weather: Weather[]) {

    // Counts each value in a string array
    function group(arr: string[]) {
      return arr.reduce((a: { [key: string]: number }, v: string) => {
        a[v] = (a[v] ?? 0) + 1;
        return a;
      }, {})
    }

    const grouped = group(weather.map(e => this.translateWeatherToGerman(e.icon ?? "")));

    const response = {
      icons: {
        data: Object.values(grouped),
        labels: Object.keys(grouped)
      },
      preci: {
        data: weather.map(e => e.precipitation),
        labels: weather.map(e => e.timestamp)
      },
      temp: {
        data: weather.map(e => e.temperature),
        labels: weather.map(e => e.timestamp)
      }
    };
    return response;
  }

  async getWeatherOberfranken() {
    const url = this.wetterOberfranken;
    const result = await axios.get(url);
    const dom = new jsdom.JSDOM(result.data)
    const days = dom.window.document.querySelectorAll("#blockfooter .seven-day-fc2");
    const dayElements = [...Array.from(days.values())];
    const data = dayElements.map(e => {
      const time = e.querySelector("time")

      if (time === null)
        throw new Error("time element not found");

      const datetime = time.getAttribute("datetime");

      if (datetime === null)
        throw new Error("datetime attribute not found")

      const [YYYY, MM, DD] = datetime.split('-');
      const date = new Date(+YYYY, +MM - 1, +DD);

      return {
        day: this.daysGerman[date.getDay()],
        date: date,
        icon: "https://www.mein-wetter.com" + e.querySelector("img")?.src,
        alt: e.querySelector("img")?.alt,
        min: e.querySelector(".temp-low2")?.textContent,
        max: e.querySelector(".temp-high2")?.textContent,
      }
    })

    return data

  }

  toDegrees(angle: number) {
    return angle * (180 / Math.PI);
  }

  toRadians(angle: number) {
    return angle * (Math.PI / 180);
  }

  getCircularMean(values: number[]) {
    const radians = values.map(this.toRadians)

    const sin_sum = radians.map(e => Math.sin(e)).reduce((a, b) => a + b)
    const cos_sum = radians.map(e => Math.cos(e)).reduce((a, b) => a + b)
    const mean_rad = Math.atan2(sin_sum, cos_sum)

    const div = this.toDegrees(mean_rad)

    // Remainder function
    function rem(a: number, b: number) {
      b = Math.abs(b);  // Ensure divisor is positive
      const remainder = a % b;
      return remainder >= 0 ? remainder : remainder + b;
    }

    return rem(div, 360)
  }

  translateWeatherToGerman(condition: string) {
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

  translateWeatherToIcon(condition: string) {
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
  weatherInGerman(condition: string) {
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
