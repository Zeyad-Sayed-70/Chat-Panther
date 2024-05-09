import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Builder, By, Key, WebDriver, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
const fs = require('fs');

@Injectable()
export class ChatService {
  private driver: WebDriver;
  private url = "https://huggingface.co/chat"
  private init_try_counter = 0
  private sendPrompt_try_counter = 0

  constructor() {
    this.initDriver();
  }

  async initDriver() {
    try {
      const options = new chrome.Options();

      options.addArguments('--headless');
      options.addArguments('--window-size=1024,768');
      options.addArguments("--disable-dev-shm-usage"); // Disable /dev/shm usage
      options.addArguments("--no-sandbox"); // Bypass OS security model

      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      const url = this.url
      const COOKIES = [
        {
            "name": "token",
            "value": "jVSGeJWjWFYXlhlSxiDYctMKaSkWoTaNrsJNMgqPerVCNmItPqNjHxHhuWUjmDFVDPWKdIivKwaUOolbxgwbQpyglFMnDfdFujZxomdSELkbzoXZhBccgJKtIISIegPM"
        },
        {
            "name": "aws-waf-token",
            "value": "5a35d0c4-c4dd-4097-85cf-1f3dbabc54be:CQoAnutpGAJtAQAA:yGxETYQEFq9iUHbbHStDZNbhh8EdoBEKJI+rn395w9N2L57sjaVXUNzv8tDbxBjgdXpApU1fg24S/HwVQAUMGX6+3yI4N3DjeRF9PmuFv4aUAsaW1iHYvnmOM/FL9s7+98ZzaV+MK9I0pJ6MLQGg+D2X7b7inDmBT9MZmOA2AbKWYyhfZ9NM/qf+XBoyqkRkr8s+urbYmJBGVPgxZ1AEQijtMOxBlrDWEXnkfIruPjV0UzkWL1qdFOMAfBeFOcdEofsaM5s="
        },
        {
            "name": "__stripe_sid",
            "value": "5c11a82b-7107-407d-ae83-6107469a65f3eaa23c"
        },
        {
            "name": "hf-chat",
            "value": "79afd632-9c0b-4a91-bc2b-30a4e7d225ef"
        },
        {
            "name": "__stripe_mid",
            "value": "5e683403-4e4b-4468-a4e6-fd3b0756158022382d"
        }
      ]

      // Add the cookies before visit the page
      COOKIES.forEach( async (cookie) => {
        await this.driver.manage().addCookie(cookie)
      })

      // Visit the page
      await this.driver.get(url);

      // Wait until the page to be changing
      await this.driver.wait(until.urlIs('https://huggingface.co/chat/'), 10000);
      
      console.log("Current URL: ", await this.driver.getCurrentUrl())
    } catch (error) {
      if ( this.init_try_counter < 3 ) {
        this.init_try_counter += 1
        this.initDriver()
      } else throw new HttpException(error.message, error.status);
    }
  }

  async sendPrompt(prompt: string, search_from_internet: boolean) {
    try {
      await this.driver.navigate().refresh()
      const start_timestamp = new Date().getTime()
      
      try {
        Logger.log("Start checking go to login page button")
        // Wait and Press go to login page btn
        const XPATH_GO_TO_LOGIN_BUTTON = '/html/body/div[2]/div/div/div/div/form/button'
        await this.driver.wait(until.elementLocated(By.xpath(XPATH_GO_TO_LOGIN_BUTTON)), 5000)
        const goToLogin = await this.driver.findElement(By.xpath(XPATH_GO_TO_LOGIN_BUTTON));
        await goToLogin.click()
      } catch (error) {
        Logger.error("Finish checking go to login page button, its not found")
        console.log(error)
      }

      // Check search_from_internet
      if ( search_from_internet ) {
        try {
          Logger.log("Start Find & interact with search from internet button")
          const XPATH_SEARCH_FROM_INTERNET_BUTTON = '//*[@id="app"]/div[1]/div/div[2]/div/div[1]/div[1]/div[1]'
          await this.driver.wait(until.elementLocated(By.xpath(XPATH_SEARCH_FROM_INTERNET_BUTTON)), 10000)
          const search_from_internet_btn = await this.driver.findElement(By.xpath(XPATH_SEARCH_FROM_INTERNET_BUTTON))
          search_from_internet_btn.click()
        } catch (error) {
          Logger.error("Finish Find & interact with search from internet button, its not found")
          console.log(error)
        }
      }
      
      // Interact with prompt textarea
      Logger.log("Start Find & interact with prompt textarea")
      const XPATH_PTOMPT_TEXTAREA = '//*[@id="app"]/div[1]/div/div[2]/div/form/div/div/textarea';
      await this.driver.wait(until.elementLocated(By.xpath(XPATH_PTOMPT_TEXTAREA)), 30000)
      const promptTextarea = await this.driver.findElement(By.xpath(XPATH_PTOMPT_TEXTAREA))
      await promptTextarea.sendKeys(prompt)
      await promptTextarea.sendKeys(Key.RETURN)
      Logger.log("Finish Find & interact with prompt textarea")

      // Waitting the loading button to appear 
      const XPATH_WAITING_BUTTON = '//*[@id="app"]/div[1]/div/div[2]/div/div[1]/button'
      await this.driver.wait(until.elementsLocated(By.xpath(XPATH_WAITING_BUTTON)), 10000)

      // Check sending message loading
      Logger.log("Start Checking send message loading")
      let isWaitingBtnDisplayed = true;
      while(isWaitingBtnDisplayed) {
        try {
          const waitingButton = await this.driver.findElement(By.xpath(XPATH_WAITING_BUTTON));
          // console.log(await waitingButton.getText());
          isWaitingBtnDisplayed = await waitingButton.isDisplayed();
        } catch (error) {
          isWaitingBtnDisplayed = false;
        }
        await this.driver.sleep(200)
      }
      Logger.log("Finish Checking send message loading")
      
      const firstMessage = await this.driver.findElement(By.xpath('//*[@id="app"]/div[1]/div/div[1]/div/div/div[2]/div[1]'))
      const result = await firstMessage.getText()
      
      await this.driver.navigate().to(this.url)
      
      Logger.log("Success operation")
      console.log("Success operation");
      
      // Calc finish timestamp
      const finish_timestamp = new Date().getTime()
      
      // Init model name
      let modelName = ''

      try {
        // Get the model name
        const XPATH_MODEL_NAME = '//*[@id="app"]/div[1]/div/div[1]/div/div/div[2]/div/div[1]/div/div[2]'
        const modelElement = await this.driver.findElement(By.xpath(XPATH_MODEL_NAME))
        modelName = await modelElement.getText()
      } catch (error) {
        console.log(error)
      }

      return {
        model: modelName,
        start_timestamp,
        finish_timestamp,
        used_internet_search: search_from_internet,
        result
      }
    } catch (error) {
      /*
        When error happen
        1. Navigate to chat page. if the session id found
        2. Init the driver again. if the session id is not found
        3. After 3 tries, return an error (may the server needs restart)
      */
        console.log(error);
        const session_id = await this.driver.getSession().then(session => session.getId(), () => null);
        if (this.sendPrompt_try_counter < 3) {
          this.sendPrompt_try_counter += 1;
          if (session_id) {
            await this.driver.navigate().to(this.url);
          } else {
            await this.initDriver();
          }
        } else {
          // Properly handle the release of resources here
          throw new HttpException('Server may need a restart', 400);
        }
    }
  }

  async loginToHuggingFace() {
      console.log(await this.driver.getCurrentUrl())
      await this.takeScreenShot()
      
      // Wait until the page navigating to login page
      await this.driver.wait(until.urlContains('https://huggingface.co/login'), 30000)
      
      // Fill in the login credentials
      const XPATH_USERNAME_INPUT = '/html/body/div/main/div/section/form/div[1]/label[1]/input'
      await this.driver.wait(until.elementLocated(By.xpath(XPATH_USERNAME_INPUT)), 30000)
      const usernameInput = await this.driver.findElement(By.xpath(XPATH_USERNAME_INPUT));
      await usernameInput.sendKeys('zeyad67sayed@gmail.com');

      console.log(await this.driver.getCurrentUrl())
      await this.takeScreenShot()
      
      // Sleep
      await this.driver.sleep(2314)

      const XPATH_PASSWORD_INPUT = '/html/body/div/main/div/section/form/div[1]/label[2]/input'
      await this.driver.wait(until.elementLocated(By.xpath(XPATH_PASSWORD_INPUT)), 30000)
      const passwordInput = await this.driver.findElement(By.xpath(XPATH_PASSWORD_INPUT));
      await passwordInput.sendKeys('wH4LM7SJxH_:2NB');

      // Sleep
      await this.driver.sleep(3028)
      await this.takeScreenShot()

      // Submit the login form
      const loginButton = await this.driver.findElement(By.xpath('/html/body/div/main/div/section/form/div[2]/button'));
      await loginButton.click();

      // Get the cookies after successful login
      const cookies = await this.driver.manage().getCookies();
      await this.takeScreenShot()
      return cookies
  }

  async takeScreenShot() {
    // Take a screenshot and obtain it as a base64 string
    let base64String = await this.driver.takeScreenshot();
      
    // Save the screenshot to a file
    const n = Math.random() * 99999
    fs.writeFileSync(`screenshot-${n}.png`, base64String, 'base64')
      
    console.log(`Screenshot saved as screenshot-${n}.png`);
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
