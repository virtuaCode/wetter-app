import { Injectable } from '@nestjs/common';
import * as fs from "fs"


@Injectable()
export class SettingsService {

    constructor() { 
        try {
            this.settings = JSON.parse(fs.readFileSync("settings/settings.json", 'utf8'));
        } catch (error) {
            this.settings = JSON.parse(fs.readFileSync("settings/settings.default.json", "utf-8"))
        }
    }
    settings: any

    getCities() {
        return this.settings.cities;
    }

    async setCities(cities: any) {
        this.settings.cities = cities;
        await this.save()
    }

    getCacheTime() {
        return this.settings.cacheTimeInMinutes;
    }

    async setCacheTime(time: number) {
        this.settings.cacheTimeInMinutes = time;
        await this.save()
    }

    getPrompt() {
        return this.settings.prompt;
    }

    async setPrompt(prompt: string) {
        this.settings.prompt = prompt;
        await this.save()
    }

    async save() {
        await fs.promises.writeFile("settings/settings.json", JSON.stringify(this.settings, null, 4))
    }
}
