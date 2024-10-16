import { Controller, Get, Param, Post, Render, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { AuthGuard } from './auth/auth.guard';

@UseGuards(AuthGuard)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }


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


  @Post('/generate/:id/:day')
  async generate(@Param('id') id: string, @Param('day') day: string, @Res() res: Response) {
    const currentCity = this.appService.getCities().find(e => e.id === id)

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

    const weather = await this.appService.getWetter(date, currentCity)
    const groups = this.appService.groupWetter(weather, 4).map((e) => {
      return {
      time: e.time,
      temperture: e.temperature + " °C",
      condition: e.condition,
      wind: e.wind + " km/h",
    }
  })

    const response = await this.appService.getGeneratedText(process.env.WEATHER_PROMPT, date, currentCity, groups)

    res.redirect("/weather/" + id + "/" + day)
    //this.appService.getGeneratedText("", )
  }


  @Get('/stats/:id/:day')
  async getStats(@Param('id') id: string, @Param('day') day: string, @Res() res: Response): Promise<any> {

    const currentCity = this.appService.getCities().find(e => e.id === id)

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
    const weather = await this.appService.getWetter(date, currentCity)


    const group = arr =>
      arr.reduce((a, v) => {
        a[v] = (a[v] ?? 0) + 1;
        return a;
      }, {});

    const grouped = group(weather.map(e => e.icon))

    console.dir(grouped)

    const response = {
      icons: {
        data: Object.values(grouped),
        labels: Object.keys(grouped)
      },
      preci: {
        data: weather.map(e => e.precipitation),
        labels: weather.map(e => e.timestamp)
      }
    }

    res.send(response)


  }



  @Get('/weather/:id/:day')
  async getWeather(@Param('id') id: string, @Param('day') day: string, @Res() res: Response): Promise<any> {

    const currentCity = this.appService.getCities().find(e => e.id === id)

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
    const weather = await this.appService.getWetter(date, currentCity)
    const grouped = await this.appService.groupWetter(weather, 3)
    const max = Math.max(...weather.map(e => Math.round(e.temperature)))
    const min = Math.min(...weather.map(e => Math.round(e.temperature)))
    const wind = Math.max(...weather.map(e => e.wind_speed))
    const daysOrdered = this.appService.getDays(new Date().getDay());
    const generatedText = this.appService.getGenerateTextCached(date, currentCity);
    const cities = this.appService.getCities();

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
