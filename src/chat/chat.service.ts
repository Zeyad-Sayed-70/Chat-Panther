import { HttpException, Injectable } from '@nestjs/common';
import { Builder, By, Key, WebDriver, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

@Injectable()
export class ChatService {
  private driver: WebDriver;

  constructor() {
    this.initDriver();
  }

  async initDriver() {
    try {
      const options = new chrome.Options();

      // options.addArguments('--headless');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--user-data-dir=/tmp/chrome-user-data');
      options.addArguments('--user-data-dir=/path/to/new/user/profile');

      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async extractProfileData(url: string, prompt: string) {
    try {
      console.log(url);

      // Visit the page
      await this.driver.get(url);

      const SL_PROMPT_INPUT = 'div > div > div > div > div > textarea';

      // Enter a prompt & press enter
      const prompt_input = await this.driver.findElement(
        By.css(SL_PROMPT_INPUT),
      );

      if (await prompt_input.isDisplayed()) {
        prompt_input.sendKeys(prompt, Key.ENTER);
      } else return this.extractProfileData(url, prompt);

      // Reading the last response
      const SL_LAST_RESPONSE =
        'div > div > div.grow > div > div.h-full.flex.flex-col > div > div > div > div:nth-child(3) > div > div > div.border.px-md.py-sm.rounded-lg.break-words.\\[word-break\\:break-word\\].text-left.max-w-full.shadow-sm.border-borderMain\\/50.ring-borderMain\\/50.divide-borderMain\\/50.dark\\:divide-borderMainDark\\/50.dark\\:ring-borderMainDark\\/50.dark\\:border-borderMainDark\\/50.bg-offset.dark\\:bg-offsetDark > div.default.font-sans.text-base.text-textMain.dark\\:text-textMainDark.selection\\:bg-superDuper.selection\\:text-textMain > div';
      const SL_COPY_BUTTON =
        'div > div > div > div:nth-child(3) > div > div > div.flex.items-start.ml-sm.mt-xs.gap-x-xs.max-w-full > button';

      // Copy button - will appear after the message done streaming
      await this.driver.wait(
        until.elementLocated(By.css(SL_COPY_BUTTON)),
        30000,
      );
      const copy_button = await this.driver.findElement(By.css(SL_COPY_BUTTON));

      console.log(await copy_button.isDisplayed());

      if (await copy_button.isDisplayed()) {
        const last_response = await this.driver.findElement(
          By.css(SL_LAST_RESPONSE),
        );

        return await last_response.getText();
      }
    } catch (error) {
      console.log(error.message, error.status);
      throw new HttpException(error.message, 400);
    }
  }

  async clearData() {
    await this.driver.manage().deleteAllCookies();
    await this.driver.executeScript('window.localStorage.clear();');
    await this.driver.executeScript('window.sessionStorage.clear();');
    await this.driver.get('chro.me://settings/clearBrowserData');
    await this.driver.findElement(By.id('#clearBrowsingDataConfirm')).click();
  }

  async isDriverAlive() {
    try {
      await this.driver.getSession();
      return true; // The driver is alive
    } catch (error) {
      return false; // The driver is not alive or disconnected
    }
  }
}
