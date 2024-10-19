import { BadRequestException, Body, Controller, Get, Param, Post, Render, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { AuthGuard } from './auth/auth.guard';
import { SettingsService } from './settings/settings.service';

@UseGuards(AuthGuard)
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly settingsService: SettingsService
  ) { }


  @Get()
  getIndex(@Res() res: Response) {
    res.redirect(this.appService.getIndex())
  }


  @Get('/cities')
  async getCities(@Res() res: Response) {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    res.render("cities", {
      weather: await this.appService.getWeatherForCities(date),
      day: date
    });
  }

  @Get('/oberfranken')
  async getOberfranken(@Res() res: Response) {
    res.render("oberfranken", {
      weather: await this.appService.getWeatherOberfranken(),
    });
  }

  @Get('/settings')
  async getSettings(@Res() res: Response) {
    const cities = this.settingsService.getCities();
    const prompt = this.settingsService.getPrompt();
    const cachetime = this.settingsService.getCacheTime();
    res.render("settings", {cities, prompt, cachetime});
  }

  @Post('/settings/prompt')
  async postSettingsPrompt(@Body() body, @Res() res: Response) {
      await this.settingsService.setPrompt(body.prompt?.trim())
      res.redirect("/settings")
  }

  @Post('/settings/cachetime')
  async postSettingsCache(@Body() body, @Res() res: Response) {
      await this.settingsService.setCacheTime(Number.parseInt(body.cachetime))
      res.redirect("/settings")
  }

  @Post('/settings/cities')
  async postSettingsCities(@Body() body, @Res() res: Response) {

    try {
      const cities = JSON.parse(body.cities)

      await this.settingsService.setCities(cities)

      res.redirect("/settings")
    } catch (error) {
      throw new BadRequestException()
    }
  }


  @Post('/generate/:id/:day')
  async generate(@Param('id') id: string, @Param('day') day: string, @Res() res: Response) {
    const currentCity = this.settingsService.getCities().find(e => e.id === id)

    if (currentCity === undefined) {
      console.log("Current City not found")
      res.status(400)
      res.send({})
      return;
    }

    const currentDayIndex = this.appService.getDays(new Date().getDay()).findIndex(d => d === day)
    const currentDay = this.appService.getDays(new Date().getDay())[currentDayIndex]

    if (currentDayIndex < 0) {
      console.log("Current Day not found")
      res.status(400)
      res.send({})
      return
    }

    const date = new Date();
    date.setDate(date.getDate() + currentDayIndex);

    const [weather, dateCache] = await this.appService.getWeather(date, currentCity)
    const groups = this.appService.groupWeather(weather, 4).map((e) => {
      return {
        time: e.time,
        temperture: e.temperature + " °C",
        condition: e.icon,
        wind: e.wind + " km/h",
      }
    })

    const data = {
      date: date.toISOString().split('T')[0],
      location: currentCity,
      weather: groups,
    }

    const response = await this.appService.getGeneratedText(this.settingsService.getPrompt(), date, currentCity, data)

    res.redirect("/weather/" + id + "/" + day)
  }


  @Get('/stats/:id/:day')
  async getStats(@Param('id') id: string, @Param('day') day: string, @Res() res: Response): Promise<any> {

    const currentCity = this.settingsService.getCities().find(e => e.id === id)

    if (currentCity === undefined) {
      console.log("Current City not found")
      res.status(400)
      res.send({})
      return;
    }

    const currentDayIndex = this.appService.getDays(new Date().getDay()).findIndex(d => d === day)
    const currentDay = this.appService.getDays(new Date().getDay())[currentDayIndex]

    if (currentDayIndex < 0) {
      console.log("Current Day not found")
      res.status(400)
      res.send({})
      return
    }

    const date = new Date();
    date.setDate(date.getDate() + currentDayIndex);
    
    const [weather, dateCache] = await this.appService.getWeather(date, currentCity)
    const response = this.appService.getWeatherStats(weather);

    res.send(response)
  }

  @Post('/refresh/:id/:day')
  async getRefresh(@Param('id') id: string, @Param('day') day: string, @Res() res: Response): Promise<any> {

    const currentCity = this.settingsService.getCities().find(e => e.id === id)

    if (currentCity === undefined) {
      console.log("Current City not found")
      return res.redirect("/")
    }

    const currentDayIndex = this.appService.getDays(new Date().getDay()).findIndex(d => d === day)
    const currentDay = this.appService.getDays(new Date().getDay())[currentDayIndex]

    if (currentDayIndex < 0) {
      console.log("Current Day not found")
      return res.redirect("/")
    }
    const date = new Date();
    date.setDate(date.getDate() + currentDayIndex);

    this.appService.clearCacheEntry(date, currentCity)

    res.redirect("/weather/" + currentCity.id + "/" + currentDay)
  }

  @Get('/weather/:id/:day')
  async getWeather(@Param('id') id: string, @Param('day') day: string, @Res() res: Response): Promise<any> {

    const currentCity = this.settingsService.getCities().find(e => e.id === id)

    if (currentCity === undefined) {
      console.log("Current City not found")
      return res.redirect("/")
    }

    const currentDayIndex = this.appService.getDays(new Date().getDay()).findIndex(d => d === day)
    const currentDay = this.appService.getDays(new Date().getDay())[currentDayIndex]

    if (currentDayIndex < 0) {
      console.log("Current Day not found")
      return res.redirect("/")
    }

    const date = new Date();
    date.setDate(date.getDate() + currentDayIndex);
    const [weather, dateCache] = await this.appService.getWeather(date, currentCity)
    const grouped = await this.appService.groupWeather(weather, 3)
    const max = Math.max(...weather.map(e => Math.round(e.temperature)))
    const min = Math.min(...weather.map(e => Math.round(e.temperature)))
    const wind = Math.max(...weather.map(e => e.wind_speed))
    const daysOrdered = this.appService.getDays(new Date().getDay());
    const generatedText = this.appService.getGenerateTextCached(date, currentCity);
    const cities = this.settingsService.getCities();

    const translateDayGerman = (day) => {
      switch (day.toLowerCase()) {
        case "sunday":
          return "Sonntag";
        case "monday":
          return "Montag";
        case "tuesday":
          return "Dienstag";
        case "wednesday":
          return "Mittwoch";
        case "thursday":
          return "Donnerstag";
        case "friday":
          return "Freitag";
        case "saturday":
          return "Samstag";
        default:
          return "Invalid day";
      }

    }

    res.render("index", {
      day: date,
      days: daysOrdered,
      dateCache,
      translateDayGerman,
      currentDay,
      currentCity,
      cities,
      min,
      max,
      wind,
      grouped,
      weather,
      generatedText
    });
  }
}
